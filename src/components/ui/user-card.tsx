import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

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
    <div className="w-full h-full group">
      <div 
        onClick={handleClick}
        className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer h-[180px] flex flex-col bg-card border border-border/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
      >
        {/* Status Badge - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-green-500/20 text-green-700 flex items-center gap-1.5 px-3 py-1">
            <span className="text-xs font-medium">Aktiv</span>
          </Badge>
        </div>

        {/* Tax Returns Count & Adressnummer - Top Right */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1">
          {adressnummer && (
            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
              Nr. {adressnummer}
            </span>
          )}
          <span className="text-sm text-gray-600 font-medium">
            {taxReturnsCount} Steuererklärungen
          </span>
        </div>

        {/* Centered Name Pill */}
        <div className="flex-1 flex items-center justify-center">
          <div 
            className="relative inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold bg-[#1d64ff] text-white transition-all duration-300 group-hover:-translate-y-2 max-w-[80%]" 
            style={{
              boxShadow: 'hsla(221, 100%, 56.1%, 0.41) 0px 32px 32px -12px'
            }}
          >
            <span className="truncate">{displayName}</span>
          </div>
        </div>

        {/* Email - Bottom */}
        <div className="text-center">
          <p className="text-sm text-gray-600 truncate">{email}</p>
        </div>
      </div>
    </div>
  );
}
