import { getMyProfile } from "@/modules/account/service";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const profile = await getMyProfile();
  return <ProfileForm profile={profile} />;
}