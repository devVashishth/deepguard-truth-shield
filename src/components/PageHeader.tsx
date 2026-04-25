import { ReactNode } from "react";

export function PageHeader({ icon: Icon, title, description, children }: {
  icon?: any;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 animate-fade-in">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="hidden md:flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}