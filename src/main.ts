import { GardenDesigner } from "./GardenDesigner";


const showLoading = () => {
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "loading";
  loadingDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      color: white;
      font-family: Arial, sans-serif;
    ">
      <div style="
        width: 60px;
        height: 60px;
        border: 4px solid #4CAF50;
        border-top: 4px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      "></div>
      <h2 style="margin: 0; color: #4CAF50;">Loading Garden Designer</h2>
      <p style="margin: 10px 0; opacity: 0.8;">Initializing 3D environment...</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(loadingDiv);
};

const hideLoading = () => {
  const loading = document.getElementById("loading");
  if (loading) {
    loading.style.opacity = "0";
    loading.style.transition = "opacity 0.5s ease-out";
    setTimeout(() => loading.remove(), 500);
  }
};


document.addEventListener("DOMContentLoaded", async () => {
  try {
    showLoading();

    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    new GardenDesigner();
    hideLoading();
  } catch (error) {
    console.error("Failed to initialize Garden Designer:", error);
    hideLoading();

    
    const errorDiv = document.createElement("div");
    errorDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        font-family: Arial, sans-serif;
      ">
        <h3>Error Loading Application</h3>
        <p>Failed to initialize the Garden Designer.</p>
        <p>Please refresh the page or check your browser console.</p>
        <button onclick="location.reload()" style="
          background: white;
          color: red;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        ">Refresh Page</button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }
});
