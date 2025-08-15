export interface UIItemConfig {
  id: string;
  displayName: string;
  meshName: string;
  category: "plants" | "models";
  thumbnail: string;
  radius: number;
  scale?: number;
}

export interface UICategoryConfig {
  id: string;
  displayName: string;
  color: string;
  items: UIItemConfig[];
}

export interface UIConfig {
  debug: boolean;
  categories: UICategoryConfig[];
}

export const UI_CONFIG: UIConfig = {
  debug: false,
  categories: [
    {
      id: "plants",
      displayName: "PLANTS",
      color: "#4CAF50",
      items: [
        {
          id: "grape_1",
          displayName: "Grape Plant 1",
          meshName: "grape_1",
          category: "plants",
          thumbnail: "/assets/images/grape.png",
          radius: 1.5,
          scale: 1.0,
        },
        {
          id: "grape_2",
          displayName: "Grape Plant 2",
          meshName: "grape_2",
          category: "plants",
          thumbnail: "/assets/images/grape.png",
          radius: 1.5,
          scale: 1.0,
        },
        {
          id: "grape_3",
          displayName: "Grape Plant 3",
          meshName: "grape_3",
          category: "plants",
          thumbnail: "/assets/images/grape.png",
          radius: 1.5,
          scale: 1.0,
        },
        {
          id: "corn_1",
          displayName: "Corn Plant 1",
          meshName: "corn_1",
          category: "plants",
          thumbnail: "/assets/images/corn.png",
          radius: 1.2,
          scale: 1.0,
        },
        {
          id: "corn_2",
          displayName: "Corn Plant 2",
          meshName: "corn_2",
          category: "plants",
          thumbnail: "/assets/images/corn.png",
          radius: 1.2,
          scale: 1.0,
        },
        {
          id: "corn_3",
          displayName: "Corn Plant 3",
          meshName: "corn_3",
          category: "plants",
          thumbnail: "/assets/images/corn.png",
          radius: 1.2,
          scale: 1.0,
        },
        {
          id: "strawberry_1",
          displayName: "Strawberry 1",
          meshName: "strawberry_1",
          category: "plants",
          thumbnail: "/assets/images/strawberry.png",
          radius: 1.0,
          scale: 1.0,
        },
        {
          id: "strawberry_2",
          displayName: "Strawberry 2",
          meshName: "strawberry_2",
          category: "plants",
          thumbnail: "/assets/images/strawberry.png",
          radius: 1.0,
          scale: 1.0,
        },
        {
          id: "strawberry_3",
          displayName: "Strawberry 3",
          meshName: "strawberry_3",
          category: "plants",
          thumbnail: "/assets/images/strawberry.png",
          radius: 1.0,
          scale: 1.0,
        },
        {
          id: "tomato_1",
          displayName: "Tomato Plant 1",
          meshName: "tomato_1",
          category: "plants",
          thumbnail: "/assets/images/tomato.png",
          radius: 1.0,
          scale: 1.0,
        },
        {
          id: "tomato_2",
          displayName: "Tomato Plant 2",
          meshName: "tomato_2",
          category: "plants",
          thumbnail: "/assets/images/tomato.png",
          radius: 1.0,
          scale: 1.0,
        },
        {
          id: "tomato_3",
          displayName: "Tomato Plant 3",
          meshName: "tomato_3",
          category: "plants",
          thumbnail: "/assets/images/tomato.png",
          radius: 1.0,
          scale: 1.0,
        },
      ],
    },
    {
      id: "models",
      displayName: "MODELS",
      color: "#FF9800",
      items: [
        {
          id: "tree",
          displayName: "Tree",
          meshName: "tree",
          category: "models",
          thumbnail: "/assets/images/leaf.jpg",
          radius: 2.0,
          scale: 1.0,
        },
        {
          id: "bench",
          displayName: "Garden Bench",
          meshName: "bench",
          category: "models",
          thumbnail: "/assets/images/leaf.jpg",
          radius: 1.5,
          scale: 1.0,
        },
        {
          id: "fountain",
          displayName: "Fountain",
          meshName: "fountain",
          category: "models",
          thumbnail: "/assets/images/leaf.jpg",
          radius: 2.5,
          scale: 1.0,
        },
        {
          id: "flower_pot",
          displayName: "Flower Pot",
          meshName: "flower_pot",
          category: "models",
          thumbnail: "/assets/images/leaf.jpg",
          radius: 1.0,
          scale: 1.0,
        },

        {
          id: "lightpole",
          displayName: "Lightpole",
          meshName: "lightpole",
          category: "models",
          thumbnail: "data:image/svg+xml;base64," + btoa(`<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" fill="#f0f0f0" rx="8"/>
            <rect x="28" y="45" width="4" height="12" fill="#666" rx="1"/>
            <rect x="29" y="25" width="6" height="20" fill="#444" rx="1"/>
            <circle cx="32" cy="22" r="6" fill="#ffeb3b" stroke="#ff9800" stroke-width="1"/>
            <circle cx="32" cy="22" r="4" fill="#fff"/>
            <path d="M32 16 L34 14 M32 16 L30 14 M26 22 L24 20 M26 22 L24 24 M38 22 L40 20 M38 22 L40 24" 
                  stroke="#ffeb3b" stroke-width="1" opacity="0.7"/>
            <ellipse cx="32" cy="58" rx="8" ry="2" fill="#000" opacity="0.2"/>
          </svg>`),
          radius: 2.0,
          scale: 1.0,
        },
      ],
    },
  ],
};

export const getCategoryById = (id: string): UICategoryConfig | undefined => {
  return UI_CONFIG.categories.find((category) => category.id === id);
};

export const getItemById = (id: string): UIItemConfig | undefined => {
  for (const category of UI_CONFIG.categories) {
    const item = category.items.find((item) => item.id === id);
    if (item) return item;
  }
  return undefined;
};

export const getItemsByCategory = (categoryId: string): UIItemConfig[] => {
  const category = getCategoryById(categoryId);
  return category ? category.items : [];
};

export const getAllItems = (): UIItemConfig[] => {
  return UI_CONFIG.categories.flatMap((category) => category.items);
};
