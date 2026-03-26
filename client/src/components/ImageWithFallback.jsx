import { useState } from 'react';
import { Box } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';

export default function ImageWithFallback({
  src,
  alt = '',
  width = 48,
  height = 48,
  sx = {},
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          borderRadius: 1,
          ...sx,
        }}
        aria-hidden
      >
        <ImageIcon color="disabled" fontSize="small" />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      sx={{
        width,
        height,
        objectFit: 'cover',
        borderRadius: 1,
        ...sx,
      }}
    />
  );
}
