import React, { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import * as tf from '@tensorflow/tfjs';
import { initNotifications } from '@mycv/f8-notification';
import '@tensorflow/tfjs-backend-webgl';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

import amthanh from './hey_sondn.mp3';
import './App.css';

const am = new Howl({
  src: [amthanh]
});

const chuacham = "chuacham";
const dacham = "dacham";
const time = 50;  // Number of frames for training
const time_hien = 0.8;  // Confidence threshold

function App() {
  const [cham, setCham] = useState(false);
  const [progress, setProgress] = useState(0);  // New state for progress percentage
  const [modelLoaded, setModelLoaded] = useState(false);  // State to track model loading
  const video = useRef();
  const model = useRef();
  const canPlay = useRef(true);
  const classifier = useRef();

  const init = async () => {
    await tf.setBackend('webgl'); 
    await tf.ready(); 
    await setupCamera();
    model.current = await mobilenet.load();
    classifier.current = knnClassifier.create();
    console.log("Model đã tải thành công");
    setModelLoaded(true);  // Update state when model is loaded
    initNotifications({ cooldown: 3000 });
  };
  
  const setupCamera = async () => {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          video.current.srcObject = stream;
          video.current.addEventListener('loadedmetadata', () => {
            resolve();
          });
        })
        .catch(error => {
          console.error("Lỗi khi truy cập camera:", error);
          reject(error);
        });
    });
  };

  const train = async (label) => {
    setModelLoaded(false); // Reset modelLoaded when training starts
    for (let i = 0; i < time; ++i) {
      const percentage = Math.round(((i + 1) / time) * 100);
      setProgress(percentage);  // Update progress percentage
      console.log(`Huấn luyện ${percentage}%`);
      await training(label);
    }
    setProgress(0);  // Reset progress after training completes
  };

  const training = async (label) => {
    const embedding = model.current.infer(video.current, true);
    classifier.current.addExample(embedding, label);
    await sleep(200);  // Delay to avoid sampling too quickly
  };

  const run = async () => {
    const embedding = model.current.infer(video.current, true);
    const result = await classifier.current.predictClass(embedding);
    if (
      result.label === dacham &&
      result.confidences[result.label] > time_hien
    ) {
      console.log("Touch ");
      setCham(true);
      if (canPlay.current) {
        canPlay.current = false;
        am.play();
      }
    } else {
      console.log("Not touch");
      setCham(false);
    }
    await sleep(200);  // Delay before running again
    run();  // Loop to continuously check predictions
  };

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  useEffect(() => {
    init();
    am.on('end', function() {
      canPlay.current = true;
    });
  }, []);

  return (
    <div className={`App ${cham ? 'cham' : ''}`}>
      <video ref={video} className="video" autoPlay />
      <div className="control">
        <button className="btn" onClick={() => train(chuacham)}>Quét Mặt</button>
        <button className="btn" onClick={() => train(dacham)}>Quét tay & Mặt</button>
        <button className="btn" onClick={() => run()}>KHỞI ĐỘNG</button>
      </div>
      
      {/* Display training progress */}
      {progress > 0 && (
        <div className="progress">
          Đang huấn luyện: {progress}%
        </div>
      )}

      {/* Display model loaded message */}
      {modelLoaded && (
        <div className="progress">
          Đã tải xong model.
        </div>
      )}

      {/* Guide Panel */}
      <div className="guide-panel">
        <h3>Hướng dẫn sử dụng</h3>
        <ul>
          <li>BƯỚC 1: Chớ 3s ~ 5s để xuống hiện từ "Đã tải xong model."</li>
          <li>BƯỚC 2 : Nhấn "Quét Mặt" để thêm mẫu nhận diện cho khuôn mặt.</li>
          <li>BƯỚC 3 : Nhấn "Quét tay & Mặt" để thêm mẫu nhận diện khi có tay và khuôn mặt.</li>
          <li>BƯỚC 4 :  Nhấn "KHỞI ĐỘNG" để bắt đầu nhận diện.</li>
          <li>Khi hệ thống nhận diện đúng, sẽ phát âm thanh báo hiệu.</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
