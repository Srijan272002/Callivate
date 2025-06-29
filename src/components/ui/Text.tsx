import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { fontFamily } from '../../styles/theme';

interface TextProps extends RNTextProps {
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({ style, children, ...props }) => {
  const defaultStyle = {
    fontFamily: fontFamily.primary,
  };

  return (
    <RNText style={[defaultStyle, style]} {...props}>
      {children}
    </RNText>
  );
}; 