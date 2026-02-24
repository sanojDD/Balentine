import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost } from "@/hooks/use-posts";
import { ImagePlus, X, Loader2 } from "lucide-react";

export function CreatePostModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createPost, isPending } = useCreatePost();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!imageFile) return;
    
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("caption", caption);
    
    createPost(formData, {
      onSuccess: () => {
        setOpen(false);
        setCaption("");
        setImageFile(null);
        setPreview(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border/50 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold text-center">Create New Post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {!preview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="h-64 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ImagePlus className="w-8 h-8 text-primary" />
              </div>
              <p className="font-medium text-muted-foreground group-hover:text-foreground">Click to select an image</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden shadow-lg border border-border group">
              <img src={preview} alt="Preview" className="w-full h-auto max-h-80 object-cover" />
              <button 
                onClick={() => { setImageFile(null); setPreview(null); }}
                className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <Textarea 
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="resize-none bg-background/50 border-border focus-visible:ring-primary h-24 text-base rounded-xl"
          />

          <Button 
            onClick={handleSubmit} 
            disabled={!imageFile || isPending}
            className="w-full py-6 text-lg font-bold bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-lg shadow-primary/20"
          >
            {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Share Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
