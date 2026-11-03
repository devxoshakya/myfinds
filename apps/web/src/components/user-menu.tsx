"use client";

import { Button } from "@myfinds/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@myfinds/ui/components/dropdown-menu";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

type UserMenuProps = {
  user: { name: string; email: string };
};

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-10 rounded-full bg-foreground text-primary-foreground hover:bg-foreground/85"
          />
        }
      >
        <User className="size-4" aria-hidden="true" />
        <span className="sr-only">Account menu for {user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">
            <span className="block truncate font-medium text-foreground">{user.name}</span>
            <span className="block truncate">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/reports" />} className="py-2.5 text-sm">
            My Reports
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="py-2.5 text-sm"
            onClick={() => {
              void authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/");
                    router.refresh();
                  },
                },
              });
            }}
          >
            <LogOut aria-hidden="true" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
