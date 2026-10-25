import React from "react";
import { Link } from "react-router-dom";
import UserAvatar from "../../../components/ui/UserAvatar";

/* "Posted by" — avatar, name (links to their profile) and role. */
export default function OwnerCell({ owner, size = 32 }) {
  return (
    <div className="ap-owner">
      <UserAvatar name={owner.name} src={owner.image} size={size} rounded="10px" />
      <div>
        <Link to={owner.path} className="ap-owner-name" onClick={(e) => e.stopPropagation()}>
          {owner.name}
        </Link>
        <span className={`ap-role ${owner.role === "ReMaker" ? "rm" : ""}`}>{owner.role}</span>
      </div>
    </div>
  );
}
