import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";

/* One side of an order: avatar, name (links to their profile) and role.
   The platform itself (Admin) has no profile page, so it is plain text. */
export default function PartyCell({ party, size = 32 }) {
  return (
    <div className="ap-owner">
      {party.type === "Admin" ? (
        <span className="ao-platform-icon" style={{ width: size, height: size }}>
          <ShieldCheck size={Math.round(size * 0.5)} />
        </span>
      ) : (
        <UserAvatar name={party.name} src={party.image} size={size} rounded="10px" />
      )}
      <div>
        {party.path ? (
          <Link to={party.path} className="ap-owner-name" onClick={(e) => e.stopPropagation()}>
            {party.name}
          </Link>
        ) : (
          <span className="ap-owner-name plain">{party.name}</span>
        )}
        <span className={`ap-role ${party.type === "ReMaker" ? "rm" : party.type === "Admin" ? "adm" : ""}`}>
          {party.type === "Admin" ? "Platform" : party.type}
        </span>
      </div>
    </div>
  );
}
