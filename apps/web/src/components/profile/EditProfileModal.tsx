import React, { useState, useRef, useEffect } from 'react';
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useSignMessage } from "wagmi";


interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  address: string;
  mutateProfile: () => void;
  setSuccessMsg: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  address, 
  mutateProfile,
  setSuccessMsg
}) => {
  const { address: publicKey } = useAppKitAccount();
  const { signMessageAsync: signMessage } = useSignMessage();
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEditUsername(userProfile?.username || "");
      setEditBio(userProfile?.bio || "");
      setEditAvatarPreview(userProfile?.avatarUrl || null);
      setEditAvatarFile(null);
      setErrorMsg("");
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const getAvatarStyle = (seed: string) => {
    const styles = ["adventurer", "big-ears", "bottts", "bottts-neutral", "critters", "pixel-art", "voxel-art", "voxel-bot"];
    let hash = 0;
    for (let i = 0; i < Math.min(seed.length, 5); i++) hash += seed.charCodeAt(i);
    return styles[hash % styles.length];
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("File is too large. Max 5MB.");
        return;
      }
      setEditAvatarFile(file);
      setEditAvatarPreview(URL.createObjectURL(file));
      setErrorMsg("");
    }
  };

  const handleSaveProfile = async () => {
    if (editBio && editBio.length > 160) {
      setErrorMsg("Bio cannot exceed 160 characters.");
      return;
    }
    
    setIsSaving(true);
    setErrorMsg("");
    
    try {
      let finalAvatarUrl = userProfile?.avatarUrl;

      if (editAvatarFile) {
        const { supabase } = await import("@/lib/supabase"); // Adjusted path to use alias
        const fileExt = editAvatarFile.name.split('.').pop();
        const fileName = `${address}-${Date.now()}.${fileExt}`;
        
        const { error: uploadErr } = await supabase.storage
          .from('banners')
          .upload(fileName, editAvatarFile);

        if (uploadErr) {
          throw new Error("Failed to upload avatar: " + uploadErr.message);
        }

        const { data } = supabase.storage.from('banners').getPublicUrl(fileName);
        finalAvatarUrl = data.publicUrl;
      }

      let token = localStorage.getItem('walletToken');
      
      if (!token) {
        if (!signMessage || !publicKey) throw new Error("Wallet not connected or does not support signing");
        setErrorMsg("Authenticating wallet...");
        
        const challengeRes = await fetch(`${API_URL}/api/auth/challenge?wallet=${publicKey}`);
        const challengeData = await challengeRes.json();
        if (!challengeData.success) throw new Error("Failed to get authentication challenge");
        
        const signature = await signMessage({ message: challengeData.message });
        
        const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey,
            message: challengeData.message,
            signature: signature
          })
        });
        
        const verifyData = await verifyRes.json();
        if (!verifyData.success) throw new Error(verifyData.error || "Failed to verify signature");
        
        token = verifyData.token;
        localStorage.setItem("walletToken", token!);
        setErrorMsg("");
      }

      const response = await fetch(`${API_URL}/api/users/${address}/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editUsername,
          bio: editBio,
          avatarUrl: finalAvatarUrl
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update profile");
      }

      await mutateProfile();
      setSuccessMsg("Profile updated successfully!");
      onClose();
      
      setTimeout(() => {
        setSuccessMsg("");
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border border-color-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Edit Profile</h2>
        
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-color-muted text-sm mb-1">Avatar</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#161A22] border-2 border-color-buy/30">
                <img 
                  src={editAvatarPreview || `https://api.dicebear.com/10.x/${getAvatarStyle(address)}/svg?seed=${address}`} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm bg-background border border-color-border text-white rounded-lg hover:border-white/50 transition-colors"
              >
                Upload Image
              </button>
            </div>
          </div>

          <div>
            <label className="block text-color-muted text-sm mb-1">Username</label>
            <input 
              type="text" 
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full bg-background border border-color-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-color-buy/50 transition-colors"
              placeholder="Enter username"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-color-muted text-sm mb-1">Bio</label>
            <textarea 
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full bg-background border border-color-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-color-buy/50 resize-none h-24 transition-colors"
              placeholder="Tell us about yourself..."
              maxLength={160}
            />
            <div className="text-right text-xs text-color-muted mt-1">
              {editBio.length}/160
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button 
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-color-muted hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-4 py-2 bg-color-buy text-black font-semibold rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
