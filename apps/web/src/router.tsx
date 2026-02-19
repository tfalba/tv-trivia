import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AboutPage } from "./pages/AboutPage";
import { PlayerScoreboardPage } from "./pages/PlayerScoreboardPage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "player-scoreboard", element: <PlayerScoreboardPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "game", element: <GamePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
