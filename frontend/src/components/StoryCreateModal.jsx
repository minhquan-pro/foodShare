import { useState, useRef } from "react";
import { FiX, FiImage, FiSend } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { createStory } from "../features/feed/feedSlice.js";
import toast from "react-hot-toast";

export default function StoryCreateModal({ onClose }) {
	const dispatch = useDispatch();
	const [preview, setPreview] = useState(null);
	const [file, setFile] = useState(null);
	const [caption, setCaption] = useState("");
	const [loading, setLoading] = useState(false);
	const inputRef = useRef(null);

	const handleFileChange = (e) => {
		const f = e.target.files[0];
		if (!f) return;
		setFile(f);
		setPreview(URL.createObjectURL(f));
	};

	const handleSubmit = async () => {
		if (!file) return toast.error("Vui lòng chọn ảnh");
		setLoading(true);
		try {
			await dispatch(createStory({ file, caption })).unwrap();
			toast.success("Đã đăng story!");
			onClose();
		} catch (err) {
			toast.error(err || "Đăng story thất bại");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

			<div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl animate-fade-in overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
					<h3 className="font-bold text-gray-900 dark:text-gray-100">Tạo story mới</h3>
					<button
						onClick={onClose}
						className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
					>
						<FiX size={18} />
					</button>
				</div>

				{/* Image picker */}
				<div className="p-4">
					{preview ? (
						<div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-72 bg-black">
							<img src={preview} alt="preview" className="w-full h-full object-cover" />
							<button
								onClick={() => { setPreview(null); setFile(null); }}
								className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
							>
								<FiX size={14} />
							</button>
						</div>
					) : (
						<button
							onClick={() => inputRef.current?.click()}
							className="flex flex-col items-center justify-center gap-3 w-full aspect-[9/16] max-h-72 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 transition-colors bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary-500 dark:hover:text-primary-400"
						>
							<FiImage size={36} />
							<span className="text-sm font-medium">Chọn ảnh</span>
						</button>
					)}
					<input
						ref={inputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleFileChange}
					/>
				</div>

				{/* Caption */}
				<div className="px-4 pb-2">
					<textarea
						value={caption}
						onChange={(e) => setCaption(e.target.value)}
						placeholder="Thêm caption... (tuỳ chọn)"
						rows={2}
						className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-600"
					/>
				</div>

				{/* Submit */}
				<div className="px-4 pb-4">
					<button
						onClick={handleSubmit}
						disabled={!file || loading}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
					>
						{loading ? (
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
						) : (
							<FiSend size={15} />
						)}
						{loading ? "Đang đăng..." : "Đăng Story"}
					</button>
				</div>
			</div>
		</div>
	);
}
