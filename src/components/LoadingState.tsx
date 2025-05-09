import React from 'react';

interface LoadingStateProps {
  /**
   * The size of the loading indicator
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Optional text to display below the loading indicator
   */
  text?: string;
  /**
   * Whether to show the loading state as an overlay
   */
  overlay?: boolean;
  /**
   * Whether to show a full-screen loading state
   */
  fullScreen?: boolean;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * A reusable loading state component
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'medium',
  text,
  overlay = false,
  fullScreen = false,
  className = '',
}) => {
  // Size mapping for the spinner
  const sizeClass = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-2',
    large: 'w-12 h-12 border-3',
  }[size];

  // Base component with spinner
  const loadingSpinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClass} rounded-full border-t-primary-500 border-primary-200 animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );

  // Full screen loading state
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
        {loadingSpinner}
      </div>
    );
  }

  // Overlay loading state
  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10 rounded">
        {loadingSpinner}
      </div>
    );
  }

  // Default inline loading state
  return loadingSpinner;
};

export default LoadingState; 