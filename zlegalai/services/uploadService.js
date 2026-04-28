const { createUploadthing, createRouteHandler } = require("uploadthing/express");
const dotenv = require("dotenv");

dotenv.config();

const f = createUploadthing();


const uploadRouter = {
  pdfUploader: f({
    "application/pdf": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
  })

    .middleware(async ({ req }) => {
      console.log("🔍 UploadThing middleware triggered");
      console.log("Request headers:", JSON.stringify(req.headers, null, 2));
      console.log("Request method:", req.method);
      console.log("Request URL:", req.url);
      
  
      return { userId: "test-user-123" };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      console.log("✅ Upload completed!");
      console.log("File:", JSON.stringify(file, null, 2));
      console.log("Metadata:", JSON.stringify(metadata, null, 2));
      
    
      return { 
        message: "File uploaded successfully",
        fileUrl: file.url,
        fileKey: file.key 
      };
    }),
};


const uploadthingHandler = createRouteHandler({
  router: uploadRouter,
});

module.exports = {
  uploadthingHandler,
};