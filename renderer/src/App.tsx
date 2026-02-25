import { PreferencesProvider } from './contexts/PreferencesContext';
import { UIProvider } from './contexts/UIContext';
import { UpdateProvider } from './contexts/UpdateContext';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  return (
    <PreferencesProvider>
      <UIProvider>
        <UpdateProvider>
          <AppLayout />
        </UpdateProvider>
      </UIProvider>
    </PreferencesProvider>
  );
}

export default App;
