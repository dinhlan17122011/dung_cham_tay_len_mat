import React, { useEffect, useRef , useState } from 'react';
import { Howl } from 'howler';
import * as tf from '@tensorflow/tfjs';
import { initNotifications, notify } from '@mycv/f8-notification';
import '@tensorflow/tfjs-backend-webgl'
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

import amthanh from './hey_sondn.mp3';
import './App.css';

const am = new Howl({
  src: [amthanh]
});

const chuacham = "chuacham";
const dacham = "dacham";
const time = 50;
const time_hien=0.8;

function App() {
  const[cham , setCham] = useState(false);
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
    for (let i = 0; i < time; ++i) {
      console.log(`Huấn luyện ${parseInt((i + 1) / time * 100)}%`);
      await training(label);
    }
  };

  const training = async (label) => {
    const embedding = model.current.infer(video.current, true);
    classifier.current.addExample(embedding, label);
    await sleep(200); // Tạm dừng một chút để tránh lấy mẫu quá nhanh
  };

  const run = async () => {
    const embedding = model.current.infer(video.current, true);
    const result = await classifier.current.predictClass(embedding);
    if(
      result.label === dacham &&
      result.confidences[result.label] > time_hien
    ){
      console.log("Touch ");
      setCham(true)
      if(canPlay.current){
        canPlay.current = false;
        am.play()
      }
    }else{
      console.log("Not touch");
      setCham(false)
    }
    await sleep(200); // Tạm dừng trước khi chạy lại
    run(); // Lặp lại để liên tục kiểm tra dự đoán
  };

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  useEffect(() => {
    init();
    am.on('end', function(){
      canPlay.current = true;
    });
  }, []);

  return (
    <div className={`App ${cham ? 'cham' :''}`}>
      <video ref={video} className="video" autoPlay />
      <div className="control">
        <button className="btn" onClick={() => train(chuacham)}>1</button>
        <button className="btn" onClick={() => train(dacham)}>2</button>
        <button className="btn" onClick={() => run()}>RUN</button>
      </div>
    </div>
  );
}

export default App;
