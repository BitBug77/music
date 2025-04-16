"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

interface Album {
  id: number;
  title: string;
  image: string;
}

export default function BestsellersGrid() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const res = await fetch("http://localhost:8000/popularity"); // change to your Django host
        const data = await res.json();
        setAlbums(data);
      } catch (err) {
        console.error("Error fetching albums:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();
  }, []);

  return (
    <div className="bg-black py-10 px-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl md:text-5xl font-bold text-yellow-100 tracking-wide">Bestsellers</h2>
        <button className="border border-yellow-100 text-yellow-100 px-4 py-2 rounded hover:bg-yellow-100 hover:text-black transition-all">
          See All
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {albums.map((album) => (
            <div key={album.id} className="aspect-square relative overflow-hidden rounded-xl">
              <Image
                src={album.image}
                alt={album.title}
                layout="fill"
                objectFit="cover"
                className="rounded-xl hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
