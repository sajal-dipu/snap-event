import { create } from "zustand";

interface LightboxState {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
}

interface UiState {
  mobileMenuOpen: boolean;
  sidebarOpen: boolean;
  lightbox: LightboxState;
  
  setMobileMenuOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  openLightbox: (images: string[], index?: number) => void;
  closeLightbox: () => void;
  nextImage: () => void;
  prevImage: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileMenuOpen: false,
  sidebarOpen: true,
  lightbox: {
    isOpen: false,
    images: [],
    currentIndex: 0,
  },
  
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  openLightbox: (images, index = 0) =>
    set({
      lightbox: {
        isOpen: true,
        images,
        currentIndex: index,
      },
    }),
    
  closeLightbox: () =>
    set((state) => ({
      lightbox: {
        ...state.lightbox,
        isOpen: false,
      },
    })),
    
  nextImage: () =>
    set((state) => {
      const { images, currentIndex } = state.lightbox;
      if (images.length === 0) return {};
      const nextIndex = (currentIndex + 1) % images.length;
      return {
        lightbox: { ...state.lightbox, currentIndex: nextIndex },
      };
    }),
    
  prevImage: () =>
    set((state) => {
      const { images, currentIndex } = state.lightbox;
      if (images.length === 0) return {};
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      return {
        lightbox: { ...state.lightbox, currentIndex: prevIndex },
      };
    }),
}));
