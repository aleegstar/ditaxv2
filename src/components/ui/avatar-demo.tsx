
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound } from "lucide-react";

function AvatarDemo() {
  return (
    <Avatar>
      <AvatarImage src="https://originui.com/avatar-80-07.jpg" alt="Kelly King" />
      <AvatarFallback>KK</AvatarFallback>
    </Avatar>
  );
}

function AvatarFallbackDemo() {
  return (
    <Avatar>
      <AvatarFallback>KK</AvatarFallback>
    </Avatar>
  );
}

function AvatarIconDemo() {
  return (
    <Avatar>
      <AvatarFallback>
        <UserRound size={16} strokeWidth={2} className="opacity-60" aria-hidden="true" />
      </AvatarFallback>
    </Avatar>
  );
}

export { AvatarDemo, AvatarFallbackDemo, AvatarIconDemo };
