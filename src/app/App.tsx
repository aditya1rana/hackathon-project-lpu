import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "628350516960-irn4aqgunph3cc7fj1jfvu7tje71e2qp.apps.googleusercontent.com"; 

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
