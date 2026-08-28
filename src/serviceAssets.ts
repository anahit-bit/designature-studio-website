export type ServiceActionType = 'image-popup' | 'pdf-download' | 'video-popup';

// Field names retain the `en` naming for backward compat with the mapper
// (rather than renaming to `url` — churn without value). Armenian twin
// (`am:` values + `filename.am`) removed 2026-08-27 when the owner dropped
// Armenian sitewide.
export interface ServiceAsset {
  action: ServiceActionType;
  en: string | string[];
  filename?: {
    en: string;
  };
}

export const SERVICE_ASSETS: Record<string, ServiceAsset> = {
  floorplans: {
    action: 'image-popup',
    en: [
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772387407/floorplan_1_byfzww.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772387408/floorplan_3_wzelhl.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772387409/floorplan_2_hdnk74.jpg'
    ],
  },
  moodboards: {
    action: 'image-popup',
    en: [
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772386564/mood_1_qoz4r3.png',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772386564/mood_2_hfeked.png',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772386565/mood_4_xyiktg.png',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772386564/mood_3_ov4bj1.png'
    ],
  },
  shopping: {
    action: 'pdf-download',
    en: 'https://res.cloudinary.com/dys2k5muv/image/upload/Shopping_list_EN_jumwvm.pdf',
    filename: { en: 'Designature_Shopping-List_EN.pdf' },
  },
  setup: {
    action: 'pdf-download',
    en: 'https://res.cloudinary.com/dys2k5muv/image/upload/Installation_Guides_EN_lm0vqq.pdf',
    filename: { en: 'Designature_Instructions_EN.pdf' },
  },
  rendering: {
    action: 'image-popup',
    en: [
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772391547/3d_render_gqn5ei.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772391549/3d_render_2_uoxs3r.jpg',
      'https://res.cloudinary.com/dys2k5muv/image/upload/v1772391819/3d_render_1_qeewnh.jpg'
    ],
  },
  tour: {
    action: 'video-popup',
    en: [
      'https://res.cloudinary.com/dys2k5muv/video/upload/v1772393597/Walkthrough_Interior_l6xslz.mp4',
      'https://res.cloudinary.com/dys2k5muv/video/upload/v1772393592/Walkthrough_exterior_hfez3u.mp4'
    ],
  },
  custom: {
    action: 'pdf-download',
    en: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1773230280/Custom_Design_EN_q68b2p.pdf',
    filename: { en: 'Designature_Custom-Designs_EN.pdf' },
  },
  technical: {
    action: 'pdf-download',
    en: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1774851142/Technical_Drawings_EN_lbf1vm.pdf',
    filename: { en: 'Designature_Technical-Plans_EN.pdf' },
  },
};