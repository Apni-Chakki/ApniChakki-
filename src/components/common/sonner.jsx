import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      offset={16}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:!min-w-0 group-[.toaster]:!max-w-[calc(100vw-2rem)] group-[.toaster]:!flex-wrap sm:group-[.toaster]:!flex-nowrap",
          title: "group-[.toast]:break-words",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:break-words",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:!whitespace-nowrap group-[.toast]:!px-3 group-[.toast]:!py-1.5",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:!whitespace-nowrap group-[.toast]:!px-3 group-[.toast]:!py-1.5",
        }
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--width": "min(360px, calc(100vw - 2rem))",
      }}
      {...props}
    />
  );
};

export { Toaster };





