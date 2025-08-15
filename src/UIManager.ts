import { getItemsByCategory } from "./config/uiConfig";

export class UIManager {
  public onCategorySelect: ((category: string) => void) | null = null;
  public onItemSelect: ((itemType: string) => void) | null = null;

  private itemPanel: HTMLElement;
  private categoryButtons: NodeListOf<Element>;
  private activeCategory: string | null = null;

  constructor() {
    this.itemPanel = document.getElementById("item-panel")!;
    this.categoryButtons = document.querySelectorAll(".category-button");


    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {

    this.categoryButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        const category = target.dataset.category;
        if (category) {
          this.selectCategory(category);
        }
      });
    });
  }

  private selectCategory(category: string): void {

    if (this.activeCategory === category) {

      this.hideItemPanel();
      this.activeCategory = null;


      this.categoryButtons.forEach((button) => {
        const btn = button as HTMLElement;
        btn.classList.remove("active");
      });

      console.log(`🔄 Toggled off category: ${category}`);
      return;
    }



    this.categoryButtons.forEach((button) => {
      const btn = button as HTMLElement;
      if (btn.dataset.category === category) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    this.activeCategory = category;


    this.showItemsForCategory(category);


    if (this.onCategorySelect) {
      this.onCategorySelect(category);
    }

    console.log(`🔄 Switched to category: ${category}`);
  }

  public showItemsForCategory(category: string): void {
    this.itemPanel.style.display = "block";
    this.itemPanel.innerHTML = "";

    // Add placement status indicator
    const statusDiv = document.createElement("div");
    statusDiv.style.cssText = `
      color: #4CAF50;
      font-size: 12px;
      text-align: center;
      margin-bottom: 10px;
      padding: 8px;
      background: rgba(76, 175, 80, 0.1);
      border-radius: 6px;
      border: 1px solid rgba(76, 175, 80, 0.3);
    `;
    statusDiv.innerHTML = "Click an item to start placing";
    this.itemPanel.appendChild(statusDiv);

    const items = this.getItemsForCategory(category);

    items.forEach((item) => {
      const itemButton = this.createItemButton(item);
      this.itemPanel.appendChild(itemButton);
    });
  }

  public updatePlacementStatus(status: string): void {
    const statusDiv = this.itemPanel.querySelector("div");
    if (statusDiv) {
      statusDiv.innerHTML = status;
    }
  }

  public updateGnomeCounter(found: number, total: number): void {
    const foundElement = document.getElementById("gnomes-found");
    const totalElement = document.getElementById("total-gnomes");
    
    if (foundElement) {
      foundElement.textContent = found.toString();
    }
    
    if (totalElement) {
      totalElement.textContent = total.toString();
    }
  }

  private getItemsForCategory(
    category: string
  ): Array<{ type: string; name: string; thumbnail?: string }> {

    const configItems = getItemsByCategory(category);


    return configItems.map((item) => ({
      type: item.id,
      name: item.displayName,
      thumbnail: item.thumbnail,
    }));
  }

  private createItemButton(item: {
    type: string;
    name: string;
    thumbnail?: string;
  }): HTMLElement {
    const button = document.createElement("div");
    button.className = "item-button";
    button.dataset.itemType = item.type;

    // Check if this is a model item and use custom icon
    if (item.thumbnail && item.thumbnail.includes("leaf.jpg")) {
      // This is a model item, use custom SVG icon
      button.innerHTML = this.createCustomModelIcon(item.type, item.name);
    } else {
      // This is a regular item with thumbnail image
      button.innerHTML = `
        <img src="${item.thumbnail}" alt="${item.name}" />
        <div class="label">${item.name}</div>
      `;
    }

    button.addEventListener("click", () => {
      if (this.onItemSelect) {
        this.onItemSelect(item.type);
      }
    });

    return button;
  }

  private createCustomModelIcon(type: string, name: string): string {
    // Create custom SVG icons for different model types
    switch (type) {
      case "tree":
        return `
          <div class="custom-icon">
            <svg width="50" height="50" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <!-- Tree trunk -->
              <rect x="25" y="35" width="10" height="20" fill="#8B4513" rx="2"/>
              <!-- Tree leaves -->
              <circle cx="30" cy="25" r="15" fill="#228B22"/>
              <!-- Highlight -->
              <circle cx="27" cy="22" r="5" fill="#32CD32" opacity="0.7"/>
            </svg>
            <div class="label">${name}</div>
          </div>
        `;
      case "bench":
        return `
          <div class="custom-icon">
            <svg width="50" height="50" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <!-- Bench seat -->
              <rect x="10" y="35" width="40" height="8" fill="#8B4513" rx="2"/>
              <!-- Bench back -->
              <rect x="10" y="25" width="40" height="8" fill="#8B4513" rx="2"/>
              <!-- Bench legs -->
              <rect x="15" y="35" width="4" height="15" fill="#696969"/>
              <rect x="41" y="35" width="4" height="15" fill="#696969"/>
            </svg>
            <div class="label">${name}</div>
          </div>
        `;
      case "fountain":
        return `
          <div class="custom-icon">
            <svg width="50" height="50" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <!-- Fountain base -->
              <ellipse cx="30" cy="45" rx="20" ry="8" fill="#808080"/>
              <!-- Fountain center -->
              <ellipse cx="30" cy="35" rx="8" ry="12" fill="#808080"/>
              <!-- Water -->
              <ellipse cx="30" cy="42" rx="18" ry="6" fill="#4A90E2" opacity="0.7"/>
              <!-- Water drops -->
              <circle cx="25" cy="30" r="2" fill="#4A90E2"/>
              <circle cx="35" cy="28" r="2" fill="#4A90E2"/>
            </svg>
            <div class="label">${name}</div>
          </div>
        `;
      case "flower_pot":
        return `
          <div class="custom-icon">
            <svg width="50" height="50" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <!-- Pot -->
              <ellipse cx="30" cy="45" rx="12" ry="8" fill="#CD853F"/>
              <!-- Flowers -->
              <circle cx="30" cy="25" r="12" fill="#FF69B4"/>
              <!-- Flower petals -->
              <circle cx="25" cy="20" r="6" fill="#FF1493"/>
              <circle cx="35" cy="20" r="6" fill="#FF1493"/>
              <circle cx="30" cy="15" r="6" fill="#FF1493"/>
            </svg>
            <div class="label">${name}</div>
          </div>
        `;
      case "stone_path":
        return `
          <div class="custom-icon">
            <svg width="50" height="50" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <!-- Stone path pieces -->
              <rect x="5" y="25" width="12" height="8" fill="#8B8B8B" rx="2"/>
              <rect x="20" y="25" width="12" height="8" fill="#8B8B8B" rx="2"/>
              <rect x="35" y="25" width="12" height="8" fill="#8B8B8B" rx="2"/>
              <rect x="50" y="25" width="12" height="8" fill="#8B8B8B" rx="2"/>
              <!-- Path direction indicator -->
              <polygon points="30,20 25,30 35,30" fill="#696969"/>
            </svg>
            <div class="label">${name}</div>
          </div>
        `;
      default:
        return `
          <div class="custom-icon">
            <svg width="50" height="50" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="15" width="30" height="30" fill="#CCCCCC" rx="5"/>
              <text x="30" y="35" text-anchor="middle" fill="#666666" font-size="12">?</text>
            </svg>
            <div class="label">${name}</div>
          </div>
        `;
    }
  }

  public hideItemPanel(): void {
    this.itemPanel.style.display = "none";
  }

  public getActiveCategory(): string | null {
    return this.activeCategory;
  }
}
