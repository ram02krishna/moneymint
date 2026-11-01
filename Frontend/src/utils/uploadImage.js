import { API_PATHS } from "./apiPath";
import axiosInstance from "./axiosInstance";

let uploadImage = async (imageFile) => {
  let formData = new FormData();
  formData.append("image", imageFile);

  let response = await axiosInstance.post(
    API_PATHS.IMAGE.UPLOAD_IMAGE,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data.data;
};

export default uploadImage;
