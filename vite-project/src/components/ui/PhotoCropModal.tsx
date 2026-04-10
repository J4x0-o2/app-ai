import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from './Modal';
import styles from './PhotoCropModal.module.css';

interface PhotoCropModalProps {
    file: File;
    onConfirm: (dataUrl: string) => void;
    onClose: () => void;
}

const CANVAS_SIZE = 360;
const OUTPUT_SIZE = 800;

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({ file, onConfirm, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; cropX: number; cropY: number } | null>(null);

    const [ready, setReady] = useState(false);
    const [cropX, setCropX] = useState(0);
    const [cropY, setCropY] = useState(0);
    const [cropSize, setCropSize] = useState(1);
    const [minDim, setMinDim] = useState(1);
    const [scale, setScale] = useState(1);

    // Load image from file
    useEffect(() => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            const min = Math.min(img.naturalWidth, img.naturalHeight);
            setMinDim(min);
            setCropSize(min);
            setCropX((img.naturalWidth - min) / 2);
            setCropY((img.naturalHeight - min) / 2);
            setScale(1);
            setReady(true);
        };
        img.src = url;
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Redraw canvas whenever crop state changes
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !ready) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }, [cropX, cropY, cropSize, ready]);

    useEffect(() => { draw(); }, [draw]);

    // ── Drag (mouse) ──
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startY: e.clientY, cropX, cropY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current || !imgRef.current) return;
        const ratio = cropSize / CANVAS_SIZE;
        const newX = clamp(dragRef.current.cropX - (e.clientX - dragRef.current.startX) * ratio, 0, imgRef.current.naturalWidth - cropSize);
        const newY = clamp(dragRef.current.cropY - (e.clientY - dragRef.current.startY) * ratio, 0, imgRef.current.naturalHeight - cropSize);
        setCropX(newX);
        setCropY(newY);
    };

    const handleMouseUp = () => { dragRef.current = null; };

    // ── Drag (touch) ──
    const touchRef = useRef<{ startX: number; startY: number; cropX: number; cropY: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        touchRef.current = { startX: t.clientX, startY: t.clientY, cropX, cropY };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchRef.current || !imgRef.current) return;
        e.preventDefault();
        const t = e.touches[0];
        const ratio = cropSize / CANVAS_SIZE;
        const newX = clamp(touchRef.current.cropX - (t.clientX - touchRef.current.startX) * ratio, 0, imgRef.current.naturalWidth - cropSize);
        const newY = clamp(touchRef.current.cropY - (t.clientY - touchRef.current.startY) * ratio, 0, imgRef.current.naturalHeight - cropSize);
        setCropX(newX);
        setCropY(newY);
    };

    const handleTouchEnd = () => { touchRef.current = null; };

    // ── Zoom ──
    const handleZoom = (newScale: number) => {
        if (!imgRef.current) return;
        const img = imgRef.current;
        const newCropSize = minDim / newScale;
        const centerX = cropX + cropSize / 2;
        const centerY = cropY + cropSize / 2;
        setCropSize(newCropSize);
        setScale(newScale);
        setCropX(clamp(centerX - newCropSize / 2, 0, img.naturalWidth - newCropSize));
        setCropY(clamp(centerY - newCropSize / 2, 0, img.naturalHeight - newCropSize));
    };

    // ── Apply crop → 800×800 JPEG ──
    const handleApply = () => {
        const img = imgRef.current;
        if (!img) return;
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        onConfirm(canvas.toDataURL('image/jpeg', 0.9));
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title="Ajustar foto de perfil"
            footer={
                <>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
                    <button className={styles.applyBtn} onClick={handleApply} disabled={!ready}>
                        Aplicar
                    </button>
                </>
            }
        >
            <div className={styles.body}>
                {!ready ? (
                    <div className={styles.loading}>Cargando imagen...</div>
                ) : (
                    <>
                        <div className={styles.canvasWrapper}>
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_SIZE}
                                height={CANVAS_SIZE}
                                className={styles.canvas}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            />
                            {/* Circular crop indicator overlay */}
                            <div className={styles.cropRing} />
                        </div>

                        <p className={styles.hint}>Arrastra para reposicionar · Zoom para ajustar</p>

                        <div className={styles.zoomRow}>
                            <ZoomOut size={15} className={styles.zoomIcon} />
                            <input
                                type="range"
                                className={styles.zoomSlider}
                                min="1"
                                max="4"
                                step="0.05"
                                value={scale}
                                onChange={e => handleZoom(Number(e.target.value))}
                            />
                            <ZoomIn size={15} className={styles.zoomIcon} />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};
