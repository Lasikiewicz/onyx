# 🎠 Carousel Mode - Full-Width Infinite Carousel

## Overview

The carousel mode provides a **console-style, full-screen gaming experience** with a **full-width infinite carousel** that extends beyond the screen edges. The selected game appears **2x larger** while staying within the continuous rotation, creating an immersive browsing experience focused on the carousel itself.

## Key Features

### 🌊 **Full-Width Infinite Carousel**
- **Edge-to-Edge Design**: Carousel extends beyond screen boundaries for seamless infinite feel
- **Higher Positioning**: Moved up from bottom for better visibility (`bottom-32`)
- **21 Visible Games**: Shows more games across the full width for better browsing
- **Center Focus**: Selected game always appears in the center of the screen
- **2x Scale**: Selected game appears twice as large while staying in the carousel flow

### 🎯 **Centered Game Information**
- **No Large Boxart**: Removed the large boxart display for cleaner focus on carousel
- **Centered Layout**: Game information displayed in the center of the screen
- **Logo Priority**: Game logos displayed prominently when available
- **Enhanced Typography**: Larger text and better spacing for readability
- **Prominent Actions**: Bigger buttons with better visual hierarchy

### 🎨 **Immersive Visual Design**
- **Clean Background**: No distracting elements, focus on the carousel
- **Floating Elements**: Carousel floats above content with subtle backdrop blur
- **Seamless Edges**: Games extend off-screen for true infinite feel
- **Visual Consistency**: Selected game maintains position while scaling

### ⌨️ **Intuitive Navigation**
- **Arrow Keys**: Navigate left/right through the infinite rotation
- **Enter**: Select the highlighted game
- **Space**: Launch the selected game
- **Mouse**: Click any visible game in the carousel to select it

## Layout Structure

### **Main Content Area**
- **Centered Information**: Game details displayed in the center of the screen
- **Full Height**: Uses entire viewport height for spacious layout
- **No Boxart**: Clean design focused on text and carousel interaction
- **Prominent Buttons**: Larger action buttons for better accessibility

### **Full-Width Carousel**
- **Extended Width**: `calc(100% + 400px)` with negative margin to extend off-screen
- **Higher Position**: `bottom-32` (128px from bottom) for better visibility
- **21 Game Display**: Shows 10 games on each side of the selected game
- **Seamless Overflow**: Games extend beyond screen edges for infinite feel

## Technical Implementation

### **Full-Width Extension**
```typescript
// Extend carousel beyond screen boundaries
style={{ 
  width: 'calc(100% + 400px)', 
  marginLeft: '-200px' 
}}
```

### **Infinite Loop Logic**
```typescript
// Show 21 games total (10 before, 1 selected, 10 after)
Array.from({ length: 21 }, (_, i) => {
  const offset = i - 10; // Center around position 10
  let gameIndex = (selectedIndex + offset) % games.length;
  if (gameIndex < 0) gameIndex += games.length;
  return games[gameIndex];
});
```

### **Positioning & Scaling**
- **Base Size**: 100px × 150px for regular games
- **Selected Scale**: `scale-150` (2x larger) for selected game
- **Center Position**: Selected game always at offset 0 (center)
- **Smooth Transitions**: `duration-300 ease-out` for all animations

## Visual Experience

### ✅ **Enhanced Features**
- **Immersive browsing**: Full-width carousel creates cinema-like experience
- **No distractions**: Clean layout focuses attention on game selection
- **Seamless infinite**: Games flow continuously beyond screen edges
- **Consistent scaling**: Selected game always appears the same size and position
- **Better visibility**: Higher positioning prevents taskbar interference

### ✅ **Improved Interactions**
- **Edge-to-edge navigation**: Games extend beyond visible area for true infinite feel
- **Instant feedback**: Click any visible game to jump to it immediately
- **Keyboard friendly**: Arrow keys work intuitively with infinite loop
- **Visual clarity**: Clear indication of selected game with scaling and border

## User Experience

### **Browsing Flow**
1. **Game information** displayed prominently in center
2. **Full-width carousel** shows extensive game collection
3. **Selected game** appears larger while staying in carousel flow
4. **Seamless navigation** through infinite rotation
5. **Immediate selection** by clicking any visible game

### **Visual Hierarchy**
- **Primary**: Selected game (2x scale, blue border)
- **Secondary**: Adjacent games (normal size, reduced opacity)
- **Background**: Game information and actions in center
- **Floating**: Carousel with subtle backdrop blur

## How to Access

1. **Right-click** anywhere in the game library
2. **Select "Carousel"** from the view mode buttons
3. **Experience full-width infinite browsing**
4. **Navigate** using arrow keys or click any visible game
5. **Switch back** to other view modes anytime

## Compatibility

- ✅ **Works with any collection size** - infinite loop handles all cases
- ✅ **Responsive design** - adapts to different screen widths
- ✅ **Performance optimized** - efficient rendering of visible games
- ✅ **All functionality preserved** (play, edit, favorite)
- ✅ **Keyboard and mouse navigation**
- ✅ **Smooth animations** and transitions

---

**Status**: ✅ **FULL-WIDTH** - Edge-to-edge infinite carousel ready!

The carousel mode now provides a **true full-width, infinite browsing experience** that extends beyond screen boundaries, creating an immersive, cinema-like interface for exploring your game collection.