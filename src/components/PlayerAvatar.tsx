interface PlayerAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
  isDrawing?: boolean;
}

export default function PlayerAvatar({ 
  name, 
  size = 'md', 
  isOnline = true,
  isDrawing = false 
}: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  };

  // Generate a consistent color based on the name
  const getColor = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
    ];
    
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initial = name.charAt(0).toUpperCase();
  const colorClass = getColor(name);

  return (
    <div className="relative inline-block">
      <div
        className={`
          ${sizeClasses[size]} 
          ${colorClass} 
          rounded-full 
          flex items-center justify-center 
          text-white font-bold
          ${isDrawing ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}
          ${!isOnline ? 'opacity-50 grayscale' : ''}
          transition-all
        `}
      >
        {initial}
      </div>
      
      {/* Online status indicator */}
      {size !== 'sm' && (
        <div
          className={`
            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      )}

      {/* Drawing indicator */}
      {isDrawing && (
        <div className="absolute -top-1 -right-1">
          <span className="text-xl">✏️</span>
        </div>
      )}
    </div>
  );
}
