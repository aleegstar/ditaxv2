import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileText, User } from "lucide-react";

interface UserCardProps {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  taxReturnsCount: number;
  adressnummer?: string;
}

export function UserCard({
  id,
  firstName,
  lastName,
  email,
  taxReturnsCount,
  adressnummer
}: UserCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/admin/user/${id}`);
  };

  const displayName = `${firstName || ''} ${lastName || ''}`.trim() || 'Unbekannt';

  return (
    <div
      onClick={handleClick}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
    >
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-foreground/[0.06] flex items-center justify-center flex-shrink-0">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground truncate">{displayName}</span>
          {adressnummer && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
              Nr. {adressnummer}
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground truncate mt-0.5">{email}</p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1 text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span className="text-[11px] font-medium">{taxReturnsCount}</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </div>
    </div>
  );
}
