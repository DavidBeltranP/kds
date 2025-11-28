import { useState, useEffect, useCallback } from 'react';

interface ScreenDimensions {
  // Viewport dimensions (browser window)
  viewportWidth: number;
  viewportHeight: number;
  // Physical screen dimensions
  screenWidth: number;
  screenHeight: number;
  // Calculated diagonal in inches (approximate)
  diagonalInches: number;
  // Device pixel ratio
  devicePixelRatio: number;
  // Orientation
  isLandscape: boolean;
  // Available height for content (excluding header/footer)
  availableHeight: number;
  // Suggested rows based on available height
  suggestedRows: number;
  // Screen category for responsive design
  screenCategory: 'small' | 'medium' | 'large' | 'xlarge';
}

// Constants for layout calculations
const HEADER_HEIGHT = 64; // px
const FOOTER_HEIGHT = 72; // px
const GRID_PADDING = 32; // 16px padding * 2
const MIN_CARD_HEIGHT = 200; // Minimum height for a card
const OPTIMAL_CARD_HEIGHT = 300; // Optimal height for readability

/**
 * Calculate approximate diagonal in inches based on CSS pixels
 * Note: This is an approximation since we can't truly know physical dimensions
 * We use devicePixelRatio and assume ~96 CSS pixels per inch as baseline
 */
function calculateDiagonalInches(
  widthPx: number,
  heightPx: number,
  dpr: number
): number {
  // Physical pixels
  const physicalWidth = widthPx * dpr;
  const physicalHeight = heightPx * dpr;

  // Diagonal in physical pixels
  const diagonalPx = Math.sqrt(physicalWidth ** 2 + physicalHeight ** 2);

  // Assume baseline PPI based on device type
  // Mobile: ~320-400 PPI, Tablet: ~200-300 PPI, Desktop: ~90-120 PPI
  // We estimate based on DPR: higher DPR usually means higher PPI device
  let estimatedPPI = 96; // baseline for standard displays
  if (dpr >= 3) {
    estimatedPPI = 400; // Mobile Retina
  } else if (dpr >= 2) {
    estimatedPPI = 220; // Retina/HiDPI
  } else if (dpr >= 1.5) {
    estimatedPPI = 140; // Medium density
  }

  return diagonalPx / estimatedPPI;
}

/**
 * Determine screen category based on dimensions
 */
function getScreenCategory(
  width: number,
  height: number,
  diagonal: number
): 'small' | 'medium' | 'large' | 'xlarge' {
  const minDimension = Math.min(width, height);

  if (diagonal < 15 || minDimension < 768) {
    return 'small';
  } else if (diagonal < 22 || minDimension < 1080) {
    return 'medium';
  } else if (diagonal < 32 || minDimension < 1440) {
    return 'large';
  }
  return 'xlarge';
}

/**
 * Calculate suggested number of rows based on available height
 */
function calculateSuggestedRows(availableHeight: number): number {
  if (availableHeight < MIN_CARD_HEIGHT) {
    return 1;
  }

  // Try to fit cards at optimal height first
  const optimalRows = Math.floor(availableHeight / OPTIMAL_CARD_HEIGHT);
  if (optimalRows >= 1) {
    return optimalRows;
  }

  // Fall back to minimum height calculation
  return Math.max(1, Math.floor(availableHeight / MIN_CARD_HEIGHT));
}

export function useScreenSize(
  headerHeight: number = HEADER_HEIGHT,
  footerHeight: number = FOOTER_HEIGHT
): ScreenDimensions {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const diagonalInches = calculateDiagonalInches(screenWidth, screenHeight, devicePixelRatio);
    const availableHeight = viewportHeight - headerHeight - footerHeight - GRID_PADDING;

    return {
      viewportWidth,
      viewportHeight,
      screenWidth,
      screenHeight,
      diagonalInches,
      devicePixelRatio,
      isLandscape: viewportWidth > viewportHeight,
      availableHeight,
      suggestedRows: calculateSuggestedRows(availableHeight),
      screenCategory: getScreenCategory(viewportWidth, viewportHeight, diagonalInches),
    };
  });

  const updateDimensions = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const diagonalInches = calculateDiagonalInches(screenWidth, screenHeight, devicePixelRatio);
    const availableHeight = viewportHeight - headerHeight - footerHeight - GRID_PADDING;

    setDimensions({
      viewportWidth,
      viewportHeight,
      screenWidth,
      screenHeight,
      diagonalInches,
      devicePixelRatio,
      isLandscape: viewportWidth > viewportHeight,
      availableHeight,
      suggestedRows: calculateSuggestedRows(availableHeight),
      screenCategory: getScreenCategory(viewportWidth, viewportHeight, diagonalInches),
    });
  }, [headerHeight, footerHeight]);

  useEffect(() => {
    // Update on resize
    window.addEventListener('resize', updateDimensions);

    // Update on orientation change (mobile)
    window.addEventListener('orientationchange', updateDimensions);

    // Update on zoom level change (detected via matchMedia)
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const handleZoomChange = () => {
      updateDimensions();
    };
    mediaQuery.addEventListener?.('change', handleZoomChange);

    // Initial update
    updateDimensions();

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      mediaQuery.removeEventListener?.('change', handleZoomChange);
    };
  }, [updateDimensions]);

  return dimensions;
}

/**
 * Hook to get just the available content height
 */
export function useAvailableHeight(
  headerHeight: number = HEADER_HEIGHT,
  footerHeight: number = FOOTER_HEIGHT
): number {
  const { availableHeight } = useScreenSize(headerHeight, footerHeight);
  return availableHeight;
}

/**
 * Hook to calculate optimal grid dimensions based on screen size
 */
export function useOptimalGridDimensions(
  columnsPerScreen: number,
  headerHeight: number = HEADER_HEIGHT,
  footerHeight: number = FOOTER_HEIGHT
) {
  const { viewportWidth, availableHeight, screenCategory } = useScreenSize(headerHeight, footerHeight);

  // Calculate column width
  const gridPadding = 32; // 16px on each side
  const columnGap = 16; // gap between columns
  const totalGaps = (columnsPerScreen - 1) * columnGap;
  const columnWidth = Math.floor((viewportWidth - gridPadding - totalGaps) / columnsPerScreen);

  // Calculate card height to fill available space
  const cardHeight = availableHeight;

  return {
    columnWidth,
    cardHeight,
    availableHeight,
    screenCategory,
    // Style object for direct use
    gridStyle: {
      height: `${availableHeight}px`,
      gridTemplateColumns: `repeat(${columnsPerScreen}, 1fr)`,
      gridTemplateRows: '1fr',
    },
  };
}
