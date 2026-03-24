import React from "react";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <style>{`
        :root {
          --background: 0 0% 4%;
          --foreground: 0 0% 95%;
          --card: 0 0% 7%;
          --card-foreground: 0 0% 95%;
          --popover: 0 0% 7%;
          --popover-foreground: 0 0% 95%;
          --primary: 0 0% 98%;
          --primary-foreground: 0 0% 9%;
          --secondary: 0 0% 15%;
          --secondary-foreground: 0 0% 98%;
          --muted: 0 0% 15%;
          --muted-foreground: 0 0% 64%;
          --accent: 0 0% 15%;
          --accent-foreground: 0 0% 98%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 0 0% 98%;
          --border: 0 0% 15%;
          --input: 0 0% 15%;
          --ring: 0 0% 83.1%;
        }
        
        body {
          background-color: hsl(0, 0%, 4%);
          color: hsl(0, 0%, 95%);
        }
        
        * {
          scrollbar-width: thin;
          scrollbar-color: hsl(0, 0%, 20%) transparent;
        }
      `}</style>
      {children}
    </div>
  );
}