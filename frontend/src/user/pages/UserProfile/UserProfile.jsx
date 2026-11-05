import React, { useEffect, useRef, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Pencil,
  Camera,
  Package,
  Heart,
  Gift,
  Leaf,
  Award,
  Star,
  ShoppingBag,
  Lock,
  Save,
  X,
  CheckCircle2,
  ChevronRight,
  Trash2,
} from "lucide-react";

import { useOrders } from "../../data/ordersStore";
import { useWishlist } from "../../data/wishlistStore";
import { useDonations } from "../../data/donationsStore";
import { useRewards } from "../../data/rewardsStore";

import CitySelect from "../../../shared/components/CitySelect";
import useMyProfile from "../../../shared/hooks/useMyProfile";
import {
  GUJARAT,
  GUJARAT_PIN_HINT,
  changeUserPassword,
  mediaUrl,
  pincodeProblem,
} from "../../../api/profile";

import "../../css/UserProfile-css/UserProfile.css";

const profileStats = [
  {
    label: "Orders",
    value: "24",
    icon: Package,
    className: "orders",
  },
  {
    label: "Wishlist",
    value: "18",
    icon: Heart,
    className: "wishlist",
  },
  {
    label: "Donations",
    value: "7",
    icon: Gift,
    className: "donations",
  },
  {
    label: "Orbit Points",
    value: "2,480",
    icon: Star,
    className: "points",
  },
];

const sustainabilityStats = [
  {
    label: "Items Reused",
    value: "18",
    description: "items given a second life",
    icon: Leaf,
  },
  {
    label: "Waste Saved",
    value: "12.6 kg",
    description: "estimated waste diverted",
    icon: Package,
  },
  {
    label: "Eco Impact",
    value: "86%",
    description: "sustainability contribution",
    icon: Award,
  },
];

export default function UserProfile() {
  /* the numbers come from the same stores as the dashboard, so they always agree */
  const myOrders = useOrders();
  const myWishlist = useWishlist();
  const myDonations = useDonations();
  const rewards = useRewards();
  const liveStats = [
    { ...profileStats[0], value: String(myOrders.length) },
    { ...profileStats[1], value: String(myWishlist.count) },
    { ...profileStats[2], value: String(myDonations.length) },
    { ...profileStats[3], value: rewards.balance.toLocaleString("en-IN") },
  ];
  const me = useMyProfile("user");
  const fileInput = useRef(null);

  const toForm = (account, profile) => ({
    full_name: account?.full_name || "",
    email: account?.email || "",
    phone: profile?.phone || "",
    city: profile?.city || "",
    state: GUJARAT,
    pincode: profile?.pincode || "",
    bio: profile?.bio || "",
  });

  const profile = {
    full_name: me.account?.full_name || "",
    email: me.account?.email || "",
    avatar: mediaUrl(me.profile?.profile_image),
  };

  const [formData, setFormData] = useState(toForm(null, null));
  const [fieldErrors, setFieldErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saveMessage, setSaveMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  /* fill the form once the server answers (and after every save) */
  useEffect(() => {
    if (me.account && !isEditing) setFormData(toForm(me.account, me.profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.account, me.profile]);

  const notify = (text, isError = false) => {
    setSaveMessage(text);
    setMessageIsError(isError);
    if (!isError) setTimeout(() => setSaveMessage(""), 3500);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((current) => ({ ...current, [name]: value }));
  };

  const handleEdit = () => {
    setFormData(toForm(me.account, me.profile));
    setFieldErrors({});
    setSaveMessage("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(toForm(me.account, me.profile));
    setFieldErrors({});
    setSaveMessage("");
    setIsEditing(false);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    const pinError = pincodeProblem(formData.pincode);
    if (pinError) {
      setFieldErrors({ pincode: [pinError] });
      notify("Please correct the highlighted fields.", true);
      return;
    }
    const { email, state, ...editable } = formData; // email is never sent; state is always Gujarat
    void email;
    void state;
    const result = await me.save(editable);
    if (result.ok) {
      setFieldErrors({});
      setIsEditing(false);
      notify(result.message);
    } else {
      setFieldErrors(result.errors || {});
      notify(result.message, true);
    }
  };

  const handlePhotoPicked = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await me.setImage("photo", file);
    notify(result.message, !result.ok);
  };

  const handlePhotoRemove = async () => {
    const result = await me.clearImage("photo");
    notify(result.message, !result.ok);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const needsCurrent = me.account?.has_password;

    if ((needsCurrent && !passwordData.currentPassword) || !passwordData.newPassword || !passwordData.confirmPassword) {
      notify("Please complete all password fields.", true);
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify("New password and confirm password do not match.", true);
      return;
    }
    try {
      await changeUserPassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
      me.reload();
      notify("Password updated successfully.");
    } catch (error) {
      notify(error.message || "Could not update the password.", true);
    }
  };

  if (me.loading && !me.account) {
    return (
      <div className="user-profile-page">
        <div className="user-profile-wrapper">
          <div className="profile-message">
            <span>Loading your profile…</span>
          </div>
        </div>
      </div>
    );
  }

  if (me.error && !me.account) {
    return (
      <div className="user-profile-page">
        <div className="user-profile-wrapper">
          <div className="profile-message is-error">
            <span>{me.error}</span>
            <button type="button" className="profile-small-edit" onClick={me.reload}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <div className="user-profile-wrapper">
        {/* PAGE HEADER */}
        <section className="profile-page-heading">
          <div>
            <span className="profile-eyebrow">MY ACCOUNT</span>

            <h1>Your Profile</h1>

            <p>
              Manage your personal information, account details and
              sustainability journey.
            </p>
          </div>

          <div className="profile-heading-actions">
            {!isEditing ? (
              <button
                type="button"
                className="profile-edit-button"
                onClick={handleEdit}
              >
                <Pencil size={17} />
                Edit Profile
              </button>
            ) : (
              <div className="profile-edit-actions">
                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={handleCancel}
                >
                  <X size={17} />
                  Cancel
                </button>

                <button
                  type="submit"
                  form="profile-form"
                  className="profile-save-button"
                >
                  <Save size={17} />
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </section>

        {/* SUCCESS / ERROR MESSAGE */}
        {saveMessage && (
          <div className={`profile-message ${messageIsError ? "is-error" : ""}`}>
            {messageIsError ? <X size={18} /> : <CheckCircle2 size={18} />}
            <span>{saveMessage}</span>
          </div>
        )}

        {/* PROFILE HERO */}
        <section className="profile-hero-card">
          <div className="profile-hero-background">
            <div className="profile-hero-circle profile-circle-one" />
            <div className="profile-hero-circle profile-circle-two" />
          </div>

          <div className="profile-hero-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.full_name} />
                ) : (
                  <span>{getInitials(profile.full_name)}</span>
                )}
              </div>

              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handlePhotoPicked}
              />

              <button
                type="button"
                className="profile-camera-button"
                title="Change profile picture"
                disabled={me.busy}
                onClick={() => fileInput.current?.click()}
              >
                <Camera size={16} />
              </button>

              {profile.avatar && (
                <button
                  type="button"
                  className="profile-photo-remove"
                  title="Remove profile picture"
                  disabled={me.busy}
                  onClick={handlePhotoRemove}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="profile-hero-info">
              <div className="profile-name-row">
                <h2>{profile.full_name}</h2>

                {me.account?.email_verified_at && (
                  <span className="verified-badge">
                    <ShieldCheck size={14} />
                    Verified
                  </span>
                )}
              </div>

              <p className="profile-email">
                <Mail size={15} />
                {profile.email}
              </p>

              <p className="profile-member">ReOrbit member</p>
            </div>

            <div className="profile-level">
              <span className="profile-level-label">MEMBER LEVEL</span>

              <strong>{rewards.level.name}</strong>

              <div className="profile-level-progress">
                <span style={{ width: `${rewards.progress}%` }} />
              </div>

              <small>{rewards.next ? `${rewards.progress}% to ${rewards.next.name}` : "Top level reached"}</small>
            </div>
          </div>
        </section>

        {/* PROFILE STATS */}
        <section className="profile-stat-grid">
          {liveStats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className={`profile-stat-card ${stat.className}`}
                key={stat.label}
              >
                <div className="profile-stat-icon">
                  <Icon size={20} />
                </div>

                <div>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              </div>
            );
          })}
        </section>

        <div className="profile-main-grid">
          {/* PERSONAL INFORMATION */}
          <section className="profile-card personal-information-card">
            <div className="profile-card-heading">
              <div>
                <span className="profile-card-kicker">ACCOUNT INFORMATION</span>

                <h3>Personal Information</h3>

                <p>Your basic profile information.</p>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  className="profile-small-edit"
                  onClick={handleEdit}
                >
                  <Pencil size={15} />
                  Edit
                </button>
              )}
            </div>

            <form
              id="profile-form"
              onSubmit={handleSaveProfile}
              className="profile-form"
            >
              <div className="profile-form-grid">
                <ProfileField
                  label="Full Name"
                  name="full_name"
                  value={formData.full_name}
                  icon={User}
                  disabled={!isEditing}
                  onChange={handleInputChange}
                  error={fieldErrors.full_name}
                />

                <ProfileField
                  label="Email Address"
                  name="email"
                  value={formData.email}
                  icon={Mail}
                  disabled
                  onChange={handleInputChange}
                  helper="Email cannot be changed here."
                />

                <ProfileField
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  icon={Phone}
                  disabled={!isEditing}
                  onChange={handleInputChange}
                  error={fieldErrors.phone}
                />

                <div className="profile-field">
                  <label htmlFor="city">City</label>
                  <CitySelect
                    id="city"
                    value={formData.city}
                    disabled={!isEditing}
                    invalid={Boolean(fieldErrors.city)}
                    onChange={(city) => {
                      setFormData((current) => ({ ...current, city }));
                      setFieldErrors((current) => ({ ...current, city: undefined }));
                    }}
                  />
                  {fieldErrors.city && (
                    <small className="profile-field-error">{fieldErrors.city[0]}</small>
                  )}
                </div>

                <ProfileField
                  label="State"
                  name="state"
                  value={GUJARAT}
                  icon={MapPin}
                  disabled
                  onChange={handleInputChange}
                  error={fieldErrors.state}
                  helper="ReOrbit is available in Gujarat only."
                />

                <ProfileField
                  label="Pincode"
                  name="pincode"
                  value={formData.pincode}
                  icon={MapPin}
                  disabled={!isEditing}
                  onChange={handleInputChange}
                  error={fieldErrors.pincode}
                  helper={isEditing ? GUJARAT_PIN_HINT : undefined}
                />
              </div>

              <div className="profile-field profile-bio-field">
                <label htmlFor="bio">Bio</label>

                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  disabled={!isEditing}
                  onChange={handleInputChange}
                  rows="4"
                  maxLength={250}
                  placeholder="Tell us a little about yourself..."
                />
                {fieldErrors.bio && (
                  <small className="profile-field-error">{fieldErrors.bio[0]}</small>
                )}
              </div>

              {isEditing && (
                <div className="profile-form-footer">
                  <span>
                    Keep your information accurate to personalize your ReOrbit
                    experience.
                  </span>

                  <button type="submit" className="profile-save-button">
                    <Save size={17} />
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* ACCOUNT SECURITY */}
          <section className="profile-card security-card">
            <div className="profile-card-heading">
              <div>
                <span className="profile-card-kicker">SECURITY</span>

                <h3>Account Security</h3>

                <p>Keep your account protected.</p>
              </div>

              <div className="security-icon">
                <ShieldCheck size={21} />
              </div>
            </div>

            <div className="security-status">
              <div className="security-status-icon">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <strong>Account secured</strong>

                <p>Your account is currently protected.</p>
              </div>
            </div>

            <div className="security-option">
              <div className="security-option-left">
                <div className="security-option-icon">
                  <Lock size={17} />
                </div>

                <div>
                  <strong>Password</strong>
                  <span>{me.account?.has_password ? "Protected with a password" : "No password yet (Google sign-in)"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordForm((current) => !current)}
              >
                Change
                <ChevronRight size={15} />
              </button>
            </div>

            {showPasswordForm && (
              <form className="password-form" onSubmit={handlePasswordSubmit}>
                {me.account?.has_password && (
                <div className="password-form-field">
                  <label htmlFor="currentPassword">Current Password</label>

                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                  />
                </div>
                )}

                <div className="password-form-field">
                  <label htmlFor="newPassword">New Password</label>

                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="password-form-field">
                  <label htmlFor="confirmPassword">Confirm Password</label>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                  />
                </div>

                <button type="submit" className="password-save-button">
                  Update Password
                </button>
              </form>
            )}

            <div className="security-option">
              <div className="security-option-left">
                <div className="security-option-icon">
                  <Mail size={17} />
                </div>

                <div>
                  <strong>Email Verification</strong>
                  <span>{profile.email}</span>
                </div>
              </div>

              <span className="verified-text">{me.account?.email_verified_at ? "Verified" : "Not verified"}</span>
            </div>
          </section>
        </div>

        {/* SUSTAINABILITY SECTION */}
        <section className="sustainability-card">
          <div className="sustainability-heading">
            <div className="sustainability-title-icon">
              <Leaf size={23} />
            </div>

            <div>
              <span>YOUR IMPACT</span>

              <h3>Your Sustainability Journey</h3>

              <p>Every action you take helps build a more circular future.</p>
            </div>
          </div>

          <div className="sustainability-stats">
            {sustainabilityStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div className="sustainability-stat" key={stat.label}>
                  <div className="sustainability-stat-icon">
                    <Icon size={20} />
                  </div>

                  <strong>{stat.value}</strong>

                  <span>{stat.label}</span>

                  <small>{stat.description}</small>
                </div>
              );
            })}
          </div>

          <div className="sustainability-footer">
            <div className="sustainability-progress-text">
              <span>Eco Journey Progress</span>
              <strong>72%</strong>
            </div>

            <div className="sustainability-progress">
              <span />
            </div>

            <p>
              Keep shopping consciously, donating and reusing to unlock your
              next ReOrbit badge.
            </p>
          </div>
        </section>

        {/* QUICK ACCOUNT LINKS */}
        <section className="profile-quick-links">
          <div className="profile-quick-link">
            <div className="profile-quick-icon">
              <ShoppingBag size={19} />
            </div>

            <div>
              <strong>My Orders</strong>
              <span>Track your purchases</span>
            </div>

            <ChevronRight size={17} />
          </div>

          <div className="profile-quick-link">
            <div className="profile-quick-icon">
              <Heart size={19} />
            </div>

            <div>
              <strong>Wishlist</strong>
              <span>View your saved items</span>
            </div>

            <ChevronRight size={17} />
          </div>

          <div className="profile-quick-link">
            <div className="profile-quick-icon">
              <Award size={19} />
            </div>

            <div>
              <strong>Badges & Rewards</strong>
              <span>Explore your achievements</span>
            </div>

            <ChevronRight size={17} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  name,
  value,
  icon: Icon,
  disabled,
  onChange,
  helper,
  error,
}) {
  return (
    <div className="profile-field">
      <label htmlFor={name}>{label}</label>

      <div className={`profile-input-wrapper ${disabled ? "is-disabled" : ""}`}>
        <Icon size={17} />

        <input
          id={name}
          name={name}
          value={value || ""}
          disabled={disabled}
          onChange={onChange}
        />
      </div>

      {error && <small className="profile-field-error">{error[0]}</small>}
      {helper && <small className="profile-field-helper">{helper}</small>}
    </div>
  );
}

function getInitials(name = "") {
  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 0) {
    return "R";
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
