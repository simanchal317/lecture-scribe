import whisper
import sys
import os

def transcribe(audio_path):
    # Ensure ffmpeg is in path
    ffmpeg_dir = os.path.dirname(os.environ.get("FFMPEG_PATH", ""))
    if ffmpeg_dir and ffmpeg_dir not in os.environ["PATH"]:
        os.environ["PATH"] += os.pathsep + ffmpeg_dir
        
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    print(result["text"])

if __name__ == "__main__":
    transcribe(sys.argv[1])
