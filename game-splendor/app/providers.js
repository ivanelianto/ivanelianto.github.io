"use client";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif"
  },
  styles: {
    global: {
      body: {
        bg: "#f5f1e8",
        color: "#1d2525"
      }
    }
  },
  components: {
    Button: {
      defaultProps: {
        borderRadius: "6px"
      }
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: "8px"
        }
      }
    }
  }
});

export function Providers({ children }) {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}
