import { useState, useEffect, useRef, useCallback } from "react";
import { FiX, FiZoomIn, FiZoomOut } from "react-icons/fi";

export default function ImageLightbox({ src, alt, children, className = "" }) {
	const [isOpen, setIsOpen] = useState(false);
	const [closing, setClosing] = useState(false);
	const [scale, setScale] = useState(1);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [dragging, setDragging] = useState(false);
	const dragStart = useRef({ x: 0, y: 0 });
	const posStart = useRef({ x: 0, y: 0 });
	const overlayRef = useRef(null);

	const open = useCallback(() => {
		setIsOpen(true);
		setScale(1);
		setPosition({ x: 0, y: 0 });
	}, []);

	const close = useCallback(() => {
		setClosing(true);
		setTimeout(() => {
			setClosing(false);
			setIsOpen(false);
		}, 250);
	}, []);

	// Block background scroll while lightbox is open
	useEffect(() => {
		if (!isOpen) return;
		const prevent = (e) => {
			e.preventDefault();
		};
		window.addEventListener("wheel", prevent, { passive: false });
		window.addEventListener("touchmove", prevent, { passive: false });
		return () => {
			window.removeEventListener("wheel", prevent);
			window.removeEventListener("touchmove", prevent);
		};
	}, [isOpen]);

	// Escape key
	useEffect(() => {
		if (!isOpen) return;
		const handleKey = (e) => {
			if (e.key === "Escape") close();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [isOpen, close]);

	// Zoom with scroll
	const handleWheel = useCallback((e) => {
		e.preventDefault();
		setScale((prev) => {
			const next = prev + (e.deltaY < 0 ? 0.25 : -0.25);
			return Math.min(Math.max(next, 0.5), 5);
		});
	}, []);

	// Drag to pan
	const handleMouseDown = (e) => {
		if (scale <= 1) return;
		e.preventDefault();
		setDragging(true);
		dragStart.current = { x: e.clientX, y: e.clientY };
		posStart.current = { ...position };
	};

	const handleMouseMove = useCallback(
		(e) => {
			if (!dragging) return;
			setPosition({
				x: posStart.current.x + (e.clientX - dragStart.current.x),
				y: posStart.current.y + (e.clientY - dragStart.current.y),
			});
		},
		[dragging],
	);

	const handleMouseUp = useCallback(() => setDragging(false), []);

	useEffect(() => {
		if (!dragging) return;
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [dragging, handleMouseMove, handleMouseUp]);

	// Double click to toggle zoom
	const handleDoubleClick = () => {
		if (scale > 1) {
			setScale(1);
			setPosition({ x: 0, y: 0 });
		} else {
			setScale(2.5);
		}
	};

	const zoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
	const zoomOut = () => {
		setScale((s) => {
			const next = Math.max(s - 0.5, 0.5);
			if (next <= 1) setPosition({ x: 0, y: 0 });
			return next;
		});
	};

	return (
		<>
			{/* Trigger - wraps children or renders an img */}
			{children ? (
				<span onClick={open} className={`cursor-zoom-in ${className}`}>
					{children}
				</span>
			) : (
				<img src={src} alt={alt} onClick={open} className={`cursor-zoom-in ${className}`} />
			)}

			{/* Lightbox overlay */}
			{isOpen && (
				<div
					ref={overlayRef}
					className={`fixed inset-0 z-[200] flex items-center justify-center transition-all duration-300 overscroll-none ${
						closing ? "opacity-0" : "opacity-100"
					}`}
				>
					{/* Backdrop */}
					<div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={close} />

					{/* Controls */}
					<div className="absolute top-4 right-4 z-10 flex items-center gap-2">
						<button
							onClick={zoomOut}
							className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
							title="Zoom out"
						>
							<FiZoomOut size={20} />
						</button>
						<span className="min-w-[50px] text-center text-sm font-medium text-white/80">
							{Math.round(scale * 100)}%
						</span>
						<button
							onClick={zoomIn}
							className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
							title="Zoom in"
						>
							<FiZoomIn size={20} />
						</button>
						<div className="mx-1 h-5 w-px bg-white/20" />
						<button
							onClick={close}
							className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
							title="Close"
						>
							<FiX size={22} />
						</button>
					</div>

					{/* Zoom hint */}
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
						<p className="text-xs text-white/50">Scroll to zoom · Double click to toggle · Drag to pan</p>
					</div>

					{/* Image */}
					<img
						src={src}
						alt={alt}
						className={`relative max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl select-none transition-transform duration-200 ${
							closing ? "scale-90 opacity-0" : "scale-100 opacity-100"
						} ${dragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-zoom-in"}`}
						style={{
							transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
						}}
						onWheel={handleWheel}
						onMouseDown={handleMouseDown}
						onDoubleClick={handleDoubleClick}
						draggable={false}
					/>
				</div>
			)}
		</>
	);
}
