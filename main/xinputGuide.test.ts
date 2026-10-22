import { describe, expect, it } from 'vitest';
import { XINPUT_GUIDE_BUTTON, guideEdge } from './xinputGuide';

describe('guideEdge', () => {
  it('fires once when Guide goes down and not while it is held', () => {
    expect(guideEdge(false, 0).pressed).toBe(false);
    expect(guideEdge(false, XINPUT_GUIDE_BUTTON)).toEqual({ down: true, pressed: true });
    expect(guideEdge(true, XINPUT_GUIDE_BUTTON)).toEqual({ down: true, pressed: false });
    expect(guideEdge(true, 0)).toEqual({ down: false, pressed: false });
  });

  it('ignores face buttons that are not Guide', () => {
    expect(guideEdge(false, 0x1000).pressed).toBe(false);
  });
});
