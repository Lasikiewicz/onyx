export interface NativeSuspendPort {
  suspend(pid: number): void;
  resume(pid: number): void;
  /** Direct children only. The service walks them recursively, as Nyrna does. Throws if the snapshot fails. */
  childPids(parentPid: number): number[];
  foreground(): { pid: number; hwnd: number; executable: string; path?: string } | null;
  showWindow(hwnd: number, command: number): void;
}

const PROCESS_SUSPEND_RESUME = 0x0800;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const TH32CS_SNAPPROCESS = 0x00000002;

/**
 * Direct ntdll/kernel32/user32 calls, matching Nyrna's Win32Process + Win32ProcessRepository.
 * PowerShell Add-Type remains the fallback when this port cannot be loaded.
 *
 * The port is only created on Windows. Loading koffi is deferred so unit tests
 * on other platforms never touch ntdll.
 */
export function loadWin32SuspendPort(): NativeSuspendPort | null {
  if (process.platform !== 'win32') return null;
  try {
    // koffi is N-API, so the same binary loads in Electron without a rebuild.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const koffi = require('koffi') as KoffiModule;
    return createPort(koffi);
  } catch (error) {
    console.warn('[Suspend] Direct ntdll suspend is unavailable; PowerShell will be used:', error);
    return null;
  }
}

interface KoffiModule {
  load(name: string): { func(signature: string): (...args: any[]) => any };
  struct(name: string, members: Record<string, unknown>): unknown;
  sizeof(type: unknown): number;
  array(type: string, length: number): unknown;
}

/** 0 and INVALID_HANDLE_VALUE (-1) are not open handles. koffi intptr may be a bigint. */
function asWin32Handle(value: unknown): number | bigint | null {
  if (typeof value === 'bigint') {
    if (value === 0n || value === -1n) return null;
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value !== 0 && value !== -1) {
    return value;
  }
  return null;
}

function asWindowHandle(value: unknown): number | null {
  const handle = asWin32Handle(value);
  if (handle == null) return null;
  const numeric = typeof handle === 'bigint' ? Number(handle) : handle;
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return null;
  return numeric;
}

function createPort(koffi: KoffiModule): NativeSuspendPort {
  const ntdll = koffi.load('ntdll.dll');
  const kernel32 = koffi.load('kernel32.dll');
  const user32 = koffi.load('user32.dll');

  // intptr, not void*: koffi returns pointer-sized integers we can pass back.
  // A void* comes back as an external object, and Number(hwnd) is then NaN,
  // so SW_FORCEMINIMIZE never reaches the foreground window.
  const NtSuspendProcess = ntdll.func('int32 __stdcall NtSuspendProcess(intptr ProcessHandle)');
  const NtResumeProcess = ntdll.func('int32 __stdcall NtResumeProcess(intptr ProcessHandle)');
  const OpenProcess = kernel32.func('intptr __stdcall OpenProcess(uint32 dwDesiredAccess, bool bInheritHandle, uint32 dwProcessId)');
  const CloseHandle = kernel32.func('bool __stdcall CloseHandle(intptr hObject)');
  const GetLastError = kernel32.func('uint32 __stdcall GetLastError()');
  const QueryFullProcessImageNameW = kernel32.func(
    'bool __stdcall QueryFullProcessImageNameW(intptr hProcess, uint32 dwFlags, _Out_ uint16_t *lpExeName, _Inout_ uint32_t *lpdwSize)',
  );
  const CreateToolhelp32Snapshot = kernel32.func('intptr __stdcall CreateToolhelp32Snapshot(uint32 dwFlags, uint32 th32ProcessID)');
  const Process32FirstW = kernel32.func('bool __stdcall Process32FirstW(intptr hSnapshot, _Inout_ PROCESSENTRY32W *lppe)');
  const Process32NextW = kernel32.func('bool __stdcall Process32NextW(intptr hSnapshot, _Inout_ PROCESSENTRY32W *lppe)');
  const GetForegroundWindow = user32.func('intptr __stdcall GetForegroundWindow()');
  const GetWindowThreadProcessId = user32.func('uint32 __stdcall GetWindowThreadProcessId(intptr hWnd, _Out_ uint32_t *lpdwProcessId)');
  const ShowWindow = user32.func('bool __stdcall ShowWindow(intptr hWnd, int nCmdShow)');

  const PROCESSENTRY32W = koffi.struct('PROCESSENTRY32W', {
    dwSize: 'uint32',
    cntUsage: 'uint32',
    th32ProcessID: 'uint32',
    th32DefaultHeapID: 'uintptr_t',
    th32ModuleID: 'uint32',
    cntThreads: 'uint32',
    th32ParentProcessID: 'uint32',
    pcPriClassBase: 'int32',
    dwFlags: 'uint32',
    szExeFile: koffi.array('char16', 260),
  });

  const act = (pid: number, invoke: (handle: number | bigint) => number, label: string): void => {
    // PROCESS_SUSPEND_RESUME only, same as Nyrna. A wider mask fails OpenProcess
    // on processes that can be suspended but not queried.
    const handle = asWin32Handle(OpenProcess(PROCESS_SUSPEND_RESUME, false, pid));
    if (handle == null) {
      const code = GetLastError();
      if (code === 5) throw new Error(`${label}: OpenProcess failed: Access is denied (Win32 error 5)`);
      throw new Error(`${label}: OpenProcess failed with Win32 error ${code}`);
    }
    try {
      const status = invoke(handle);
      if (status !== 0) throw new Error(`${label} failed with NTSTATUS ${status}`);
    } finally {
      CloseHandle(handle);
    }
  };

  const imagePath = (pid: number): string => {
    const handle = asWin32Handle(OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid));
    if (handle == null) return '';
    try {
      const characters = [1024];
      const buffer = Buffer.alloc(characters[0] * 2);
      const ok = QueryFullProcessImageNameW(handle, 0, buffer, characters);
      if (!ok) return '';
      const length = Math.max(0, characters[0]);
      return buffer.toString('utf16le', 0, length * 2).replace(/\0+$/, '');
    } finally {
      CloseHandle(handle);
    }
  };

  return {
    suspend(pid: number): void {
      act(pid, NtSuspendProcess, 'NtSuspendProcess');
    },
    resume(pid: number): void {
      act(pid, NtResumeProcess, 'NtResumeProcess');
    },
    showWindow(hwnd: number, command: number): void {
      ShowWindow(hwnd, command);
    },
    foreground(): { pid: number; hwnd: number; executable: string; path?: string } | null {
      const hwnd = asWindowHandle(GetForegroundWindow());
      if (hwnd == null) return null;
      const pidOut = [0];
      GetWindowThreadProcessId(hwnd, pidOut);
      const pid = Number(pidOut[0]);
      if (!Number.isInteger(pid) || pid <= 0) return null;
      const path = imagePath(pid);
      const executable = path ? path.split('\\').pop() || '' : '';
      return { pid, hwnd, executable, path: path || undefined };
    },
    childPids(parentPid: number): number[] {
      const snapshot = asWin32Handle(CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0));
      if (snapshot == null) {
        throw new Error(`CreateToolhelp32Snapshot failed with Win32 error ${GetLastError()}`);
      }
      try {
        const entry: {
          dwSize: number;
          th32ProcessID?: number;
          th32ParentProcessID?: number;
        } = { dwSize: koffi.sizeof(PROCESSENTRY32W) };
        const children: number[] = [];
        if (!Process32FirstW(snapshot, entry)) {
          throw new Error(`Process32FirstW failed with Win32 error ${GetLastError()}`);
        }
        do {
          if (entry.th32ParentProcessID === parentPid && entry.th32ProcessID && entry.th32ProcessID > 4) {
            children.push(entry.th32ProcessID);
          }
        } while (Process32NextW(snapshot, entry));
        return children;
      } finally {
        CloseHandle(snapshot);
      }
    },
  };
}
