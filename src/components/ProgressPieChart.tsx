import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface ProgressPieChartProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  progressColor?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  children?: React.ReactNode;
}

export function ProgressPieChart({
  progress,
  size = 120,
  strokeWidth = 12,
  progressColor = '#22C55E',
  backgroundColor = '#E5E7EB',
  showPercentage = true,
  children,
}: ProgressPieChartProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (clampedProgress / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {children || (
          showPercentage && (
            <Text style={{ fontSize: size * 0.22, fontWeight: 'bold', color: '#374151' }}>
              {Math.round(clampedProgress)}%
            </Text>
          )
        )}
      </View>
    </View>
  );
}
