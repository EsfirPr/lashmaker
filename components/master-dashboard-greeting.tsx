"use client";

import { useEffect, useState } from "react";

function getGreetingByHour(hour: number) {
  if (hour >= 6 && hour <= 11) {
    return "Доброе утро";
  }

  if (hour >= 12 && hour <= 16) {
    return "Добрый день";
  }

  if (hour >= 17 && hour <= 22) {
    return "Добрый вечер";
  }

  return "Доброй ночи";
}

function getCurrentGreeting() {
  return getGreetingByHour(new Date().getHours());
}

type MasterDashboardGreetingProps = {
  nickname: string;
};

export function MasterDashboardGreeting({ nickname }: MasterDashboardGreetingProps) {
  const [greeting, setGreeting] = useState("Здравствуйте");

  useEffect(() => {
    setGreeting(getCurrentGreeting());

    const timer = window.setInterval(() => {
      setGreeting(getCurrentGreeting());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <h1 className="page-title" suppressHydrationWarning>
      {greeting}, {nickname}
    </h1>
  );
}
