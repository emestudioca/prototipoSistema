import { BrowserRouter } from "react-router-dom";
import { AuthProvider, ThemeProvider } from "@gestionate/core/client";
import { authApi } from "./registry";
import AppRoutes from "./routes";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider api={authApi}>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}