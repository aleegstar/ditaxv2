
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { User } from '@/types';

interface UserInfoCardProps {
  user: User;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({ user }) => {
  return (
    <div 
      className="rounded-[20px] p-6 relative overflow-hidden shadow-lg"
      style={{
        background: 'hsla(0, 0%, 97%, 1)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 flex items-center justify-center">
            <span className="text-lg font-bold text-slate-700">
              {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-black tracking-tight">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-500">
              {user.email || 'Keine E-Mail verfügbar'}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-8">
            <span className="text-gray-500">Status</span>
            <Badge 
              variant="secondary" 
              className="border border-white/20 backdrop-blur-sm"
              style={{ background: 'rgba(82, 152, 228, 0.28)', borderRadius: '12px', color: '#000' }}
            >
              {user.status}
            </Badge>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-gray-500">Rolle</span>
            <span className="text-black font-medium">{user.role}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-gray-500">Dokumente</span>
            <span className="text-[hsl(222,100%,50%)] font-medium">{user.documents.length}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-gray-500">Steuererklärungen</span>
            <span className="text-[hsl(222,100%,50%)] font-medium">{user.taxReturns.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;
