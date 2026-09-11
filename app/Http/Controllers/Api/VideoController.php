<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVideoRequest;
use App\Models\EducationalVideo;
use Illuminate\Http\Request;

class VideoController extends Controller
{
    // لیست ویدیوها
    public function index(Request $request)
    {
        $query = EducationalVideo::query();

        if (!$request->boolean('all')) {
            $query->where('is_active', true);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $videos = $query->orderBy('order')->orderBy('created_at', 'desc')->get();

        return response()->json($videos);
    }

    // ثبت ویدیو جدید
    public function store(StoreVideoRequest $request)
    {
        $video = EducationalVideo::create($request->validated());

        return response()->json([
            'message' => 'ویدیو با موفقیت ثبت شد',
            'video' => $video,
        ], 201);
    }

    // جزئیات یک ویدیو
    public function show($id)
    {
        $video = EducationalVideo::findOrFail($id);
        return response()->json($video);
    }

    // ویرایش ویدیو
    public function update(StoreVideoRequest $request, $id)
    {
        $video = EducationalVideo::findOrFail($id);
        $video->update($request->validated());

        return response()->json([
            'message' => 'ویدیو با موفقیت ویرایش شد',
            'video' => $video,
        ]);
    }

    // حذف ویدیو
    public function destroy($id)
    {
        $video = EducationalVideo::findOrFail($id);
        $video->delete();

        return response()->json(['message' => 'ویدیو با موفقیت حذف شد']);
    }
}