export function gameFilename(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, "").replace(/[^a-z0-9]/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() + ".png";
}

export function getGenreColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 80%, 65%)`;
}
