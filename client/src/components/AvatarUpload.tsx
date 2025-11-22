import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AvatarUploadProps {
  avatarUrl: string | null;
  userName: string;
  onUploadComplete?: (url: string) => void;
}

export default function AvatarUpload({ avatarUrl, userName, onUploadComplete }: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const validateFile = (file: File): boolean => {
    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG ou WebP.');
      return false;
    }

    // Validar tamanho (máx 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 2MB.');
      return false;
    }

    return true;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      event.target.value = '';
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload automático
    await uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;

    try {
      setUploading(true);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Se já existe um avatar, deletar o anterior
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        if (oldPath.startsWith('avatars/')) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload do novo arquivo
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar perfil com nova URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Foto atualizada com sucesso!');
      onUploadComplete?.(publicUrl);
      setPreview(null);
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error(error.message || 'Erro ao fazer upload da foto');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;

    try {
      setUploading(true);

      // Deletar arquivo do storage
      const oldPath = avatarUrl.split('/').slice(-2).join('/');
      if (oldPath.startsWith('avatars/')) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Atualizar perfil removendo URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Foto removida com sucesso!');
      onUploadComplete?.(null as any);
      setPreview(null);
    } catch (error: any) {
      console.error('Erro ao remover foto:', error);
      toast.error(error.message || 'Erro ao remover foto');
    } finally {
      setUploading(false);
    }
  };

  const currentAvatarUrl = preview || avatarUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-32 w-32">
          <AvatarImage src={currentAvatarUrl || undefined} alt={userName} />
          <AvatarFallback className="text-3xl">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-4 w-4 mr-2" />
          {avatarUrl ? 'Trocar Foto' : 'Adicionar Foto'}
        </Button>

        {avatarUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading}
          >
            <X className="h-4 w-4 mr-2" />
            Remover
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        JPG, PNG ou WebP. Tamanho máximo: 2MB.
      </p>
    </div>
  );
}
