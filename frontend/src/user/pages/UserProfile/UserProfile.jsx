import React, { useEffect, useState } from "react";
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
} from "lucide-react";

import "../../css/UserProfile-css/UserProfile.css";

const defaultProfile = {
  full_name: "Dishank Prajapati",
  email: "dishank@example.com",
  phone: "+91 98765 43210",
  date_of_birth: "15 August 2004",
  gender: "Male",
  location: "Ahmedabad, Gujarat",
  bio: "Passionate about sustainable living, creative products and giving things a second life.",
  avatar: "",
};

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
  const [profile, setProfile] = useState(defaultProfile);
  const [formData, setFormData] = useState(defaultProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("reorbit_user");

    if (!storedUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      const updatedProfile = {
        ...defaultProfile,
        ...parsedUser,
      };

      setProfile(updatedProfile);
      setFormData(updatedProfile);
    } catch (error) {
      console.error("Unable to load user profile.", error);
    }
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setFormData(profile);
    setSaveMessage("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(profile);
    setSaveMessage("");
    setIsEditing(false);
  };

  const handleSaveProfile = (event) => {
    event.preventDefault();

    const updatedProfile = {
      ...profile,
      ...formData,
    };

    setProfile(updatedProfile);
    setFormData(updatedProfile);

    localStorage.setItem("reorbit_user", JSON.stringify(updatedProfile));

    setIsEditing(false);
    setSaveMessage("Profile updated successfully.");

    setTimeout(() => {
      setSaveMessage("");
    }, 3500);
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setSaveMessage("Please complete all password fields.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveMessage("New password and confirm password do not match.");
      return;
    }

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setShowPasswordForm(false);
    setSaveMessage("Password updated successfully.");

    setTimeout(() => {
      setSaveMessage("");
    }, 3500);
  };

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
          <div className="profile-message">
            <CheckCircle2 size={18} />
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

              <button
                type="button"
                className="profile-camera-button"
                title="Change profile picture"
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="profile-hero-info">
              <div className="profile-name-row">
                <h2>{profile.full_name}</h2>

                <span className="verified-badge">
                  <ShieldCheck size={14} />
                  Verified
                </span>
              </div>

              <p className="profile-email">
                <Mail size={15} />
                {profile.email}
              </p>

              <p className="profile-member">ReOrbit member</p>
            </div>

            <div className="profile-level">
              <span className="profile-level-label">MEMBER LEVEL</span>

              <strong>Eco Explorer</strong>

              <div className="profile-level-progress">
                <span />
              </div>

              <small>72% to Eco Champion</small>
            </div>
          </div>
        </section>

        {/* PROFILE STATS */}
        <section className="profile-stat-grid">
          {profileStats.map((stat) => {
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
                />

                <ProfileField
                  label="Date of Birth"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  icon={Calendar}
                  disabled={!isEditing}
                  onChange={handleInputChange}
                />

                <div className="profile-field">
                  <label htmlFor="gender">Gender</label>

                  <div className="profile-input-wrapper">
                    <User size={17} />

                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      disabled={!isEditing}
                      onChange={handleInputChange}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">
                        Prefer not to say
                      </option>
                    </select>
                  </div>
                </div>

                <ProfileField
                  label="Location"
                  name="location"
                  value={formData.location}
                  icon={MapPin}
                  disabled={!isEditing}
                  onChange={handleInputChange}
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
                  placeholder="Tell us a little about yourself..."
                />
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
                  <span>Last updated recently</span>
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

              <span className="verified-text">Verified</span>
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
