import { calculateVirtualWindow, calculateLeftSpacerWidth } from '../renderer/src/utils/virtualization';

// Simple assert helper
function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

const totalItems = 100;
const bufferLeft = 10;
const bufferRight = 10;
const itemWidth = 100;
const itemPadding = 1;

// Case 1: Start of list
{
  const selectedIndex = 5;
  const { startIndex, endIndex } = calculateVirtualWindow(selectedIndex, totalItems, { bufferLeft, bufferRight });
  assertEqual(startIndex, 0, 'Case 1 startIndex');
  assertEqual(endIndex, 15, 'Case 1 endIndex');

  const spacer = calculateLeftSpacerWidth(startIndex, itemWidth, itemPadding);
  assertEqual(spacer, 0, 'Case 1 spacer');
  console.log('Case 1 passed');
}

// Case 2: Middle of list
{
  const selectedIndex = 50;
  const { startIndex, endIndex } = calculateVirtualWindow(selectedIndex, totalItems, { bufferLeft, bufferRight });
  assertEqual(startIndex, 40, 'Case 2 startIndex');
  assertEqual(endIndex, 60, 'Case 2 endIndex');

  const spacer = calculateLeftSpacerWidth(startIndex, itemWidth, itemPadding);
  // Stride = 100 + 2*1 + 1 = 103.
  // Spacer = 40 * 103 - 1 = 4120 - 1 = 4119.
  assertEqual(spacer, 4119, 'Case 2 spacer');
  console.log('Case 2 passed');
}

// Case 3: End of list
{
  const selectedIndex = 95;
  const { startIndex, endIndex } = calculateVirtualWindow(selectedIndex, totalItems, { bufferLeft, bufferRight });
  assertEqual(startIndex, 85, 'Case 3 startIndex');
  assertEqual(endIndex, 100, 'Case 3 endIndex');

  const spacer = calculateLeftSpacerWidth(startIndex, itemWidth, itemPadding);
  // Spacer = 85 * 103 - 1 = 8755 - 1 = 8754.
  assertEqual(spacer, 8754, 'Case 3 spacer');
  console.log('Case 3 passed');
}

console.log('All tests passed');
