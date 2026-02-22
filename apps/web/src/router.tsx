import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "game", element: <GamePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
