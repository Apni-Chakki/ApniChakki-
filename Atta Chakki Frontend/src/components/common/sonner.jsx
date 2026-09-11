import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      offset={20}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-[#fffdfa] group-[.toaster]:text-[#3d3020] group-[.toaster]:border-[#e8decb] group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:!min-w-0 group-[.toaster]:!max-w-[calc(100vw-2rem)] group-[.toaster]:!flex-wrap sm:group-[.toaster]:!flex-nowrap font-sans",
          title: "group-[.toast]:break-words font-semibold text-[#3d3020]",
          description: "group-[.toast]:text-[#6b5d48] group-[.toast]:break-words text-xs",
          actionButton: "group-[.toast]:!bg-[#8b6f47] group-[.toast]:hover:!bg-[#755c3a] group-[.toast]:!text-white group-[.toast]:!font-semibold group-[.toast]:!rounded-xl group-[.toast]:!text-xs group-[.toast]:!whitespace-nowrap group-[.toast]:!px-3.5 group-[.toast]:!py-2 group-[.toast]:!shadow-sm transition-all",
          cancelButton: "group-[.toast]:!bg-[#f5ede3] group-[.toast]:!text-[#3d3020] group-[.toast]:!rounded-xl group-[.toast]:!whitespace-nowrap group-[.toast]:!px-3 group-[.toast]:!py-1.5",
          warning: "group-[.toaster]:!bg-[#fffcf5] group-[.toaster]:!border-[#ebd3a7] group-[.toaster]:!text-[#4a2f0a]",
          success: "group-[.toaster]:!bg-[#f6fbf7] group-[.toaster]:!border-[#ccebda] group-[.toaster]:!text-[#14532d]",
          error: "group-[.toaster]:!bg-[#fef2f2] group-[.toaster]:!border-[#fecaca] group-[.toaster]:!text-[#991b1b]",
          info: "group-[.toaster]:!bg-[#f8fafc] group-[.toaster]:!border-[#e2e8f0] group-[.toaster]:!text-[#1e293b]",
        }
      }}
      style={{
        "--normal-bg": "#fffdfa",
        "--normal-text": "#3d3020",
        "--normal-border": "#e8decb",
        "--width": "min(400px, calc(100vw - 2rem))",
      }}
      {...props}
    />
  );
};

export { Toaster };





