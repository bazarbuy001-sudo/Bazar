const videos = [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
  ];
  
  let current = 2;
  
  const centerVideo = document.getElementById("centerVideo");
  const left = document.getElementById("leftPreviews");
  const right = document.getElementById("rightPreviews");
  
  document.getElementById("storiesPrev").onclick = () => move(-1);
  document.getElementById("storiesNext").onclick = () => move(1);
  
  function move(dir) {
    current += dir;
    if (current < 0) current = videos.length - 1;
    if (current >= videos.length) current = 0;
    render();
  }
  
  function render() {
    // центр
    centerVideo.src = videos[current];
    centerVideo.muted = true;
    centerVideo.play().catch(()=>{});
  
    left.innerHTML = "";
    right.innerHTML = "";
  
    for (let i = 1; i <= 2; i++) {
      addPreview(left, (current - i + videos.length) % videos.length);
      addPreview(right, (current + i) % videos.length);
    }
  }
  
  function addPreview(container, index) {
    const card = document.createElement("div");
    card.className = "preview-card";
    card.innerHTML = `<video muted loop playsinline src="${videos[index]}"></video>`;
    card.onclick = () => {
      current = index;
      render();
    };
    container.appendChild(card);
  }
  
  render();
  