import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { FiCamera, FiUpload, FiCheck, FiAlertTriangle, FiLoader } from 'react-icons/fi';

const WasteClassifier = ({ onClassify, onImageSelected }) => {
    const [model, setModel] = useState(null);
    const [imageURL, setImageURL] = useState(null);
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState(null);
    const [error, setError] = useState(null);
    const imageRef = useRef(null);

    // Load MobileNet Model
    useEffect(() => {
        const loadModel = async () => {
            try {
                console.log('Loading MobileNet model...');
                const loadedModel = await mobilenet.load();
                setModel(loadedModel);
                console.log('Model loaded.');
            } catch (err) {
                console.error('Failed to load model:', err);
                setError('Failed to load AI model. Please check your connection.');
            }
        };
        loadModel();
    }, []);

    // Trigger classification when model loads or image changes
    useEffect(() => {
        if (model && imageURL && imageRef.current) {
            classifyImage();
        }
    }, [model, imageURL]);

    const classifyImage = async () => {
        if (!model || !imageRef.current) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Ensure the image is fully loaded by the browser
            if (!imageRef.current.complete) {
               await new Promise((resolve) => imageRef.current.onload = resolve);
            }

            const predictions = await model.classify(imageRef.current);
            console.log('Predictions:', predictions);
            
            if (predictions && predictions.length > 0) {
                // Check top 3 predictions for mixed content
                const topClasses = predictions.slice(0, 3).map(p => p.className.toLowerCase());
                const wasteType = mapToWasteType(topClasses);
                
                setPrediction({
                    className: predictions[0].className, // Show top detected object
                    wasteType: wasteType,
                    probability: predictions[0].probability
                });
                
                // Pass the result back to parent
                onClassify(wasteType);
            } else {
                setError('Could not classify image.');
            }
        } catch (err) {
            console.error(err);
            setError('Error during classification.');
        } finally {
            setLoading(false);
        }
    };

    // Heuristic mapping from ImageNet classes to Waste Types
    const mapToWasteType = (classNames) => {
        // Helper to check if a single class string matches a category
        const checkBio = (name) => [
            'fruit', 'vegetable', 'food', 'bread', 'meat', 'chicken', 'fish', 'flower', 'leaf', 'garden', 'plant', 'corn', 'mushroom', 
            'strawberry', 'lemon', 'pineapple', 'fig', 'custard', 'berry', 'broccoli', 'cabbage', 'carrot', 'cucumber', 'potato', 'tomato', 
            'onion', 'pepper', 'spinach', 'squash', 'zucchini', 'artichoke', 'bell pepper', 'cardoon', 'pomegranate', 'jackfruit', 
            'custard apple', 'banana', 'orange', 'apple', 'granny smith', 'grocery', 'produce', 'bean', 'pea', 'lentil', 'radish', 
            'turnip', 'beet', 'asparagus', 'celery', 'eggplant', 'garlic', 'ginger', 'lettuce', 'cauliflower', 'potpie', 'burrito', 
            'pizza', 'hotdog', 'hamburger', 'cheeseburger', 'sandwich', 'salad', 'soup', 'stew', 'curry', 'mashed', 'bakery', 'market'
        ].some(k => name.includes(k));
        const checkPlastic = (name) => ['bottle', 'plastic', 'nylon', 'toy', 'container', 'bag', 'poly', 'lego', 'wrapper', 'packaging'].some(k => name.includes(k)) && !name.includes('glass') && !name.includes('paper');
        const checkGlass = (name) => ['glass', 'beer', 'wine', 'jar', 'goblet', 'mirror', 'mug', 'cup'].some(k => name.includes(k));
        const checkDry = (name) => [
            'paper', 'magazine', 'newspaper', 'cardboard', 'book', 'envelope', 'packet', 'carton', 
            'metal', 'can', 'aluminum', 'tin', 'foil', 'iron', 'steel', 'copper',
            'menu', 'binder', 'notebook', 'clipboard', 'brochure', 'pamphlet', 'tissue', 'towel', 
            'box', 'publication', 'comic book', 'sheet'
        ].some(k => name.includes(k));

        // Check if we have conflicting detections in top results (Mixed)
        const hasBio = classNames.some(name => checkBio(name));
        const hasPlastic = classNames.some(name => checkPlastic(name));
        
        // If both Bio and Plastic are detected with high confidence (simulated by being in top 3), treat as Mixed
        if (hasBio && hasPlastic) return 'Mixed Waste';

        // Check the TOP result first for specific classification
        const top = classNames[0];
        if (checkBio(top)) return 'Bio-degradable Waste';
        if (checkPlastic(top)) return 'Plastic Waste';
        if (checkGlass(top)) return 'Glass Waste';
        if (checkDry(top)) return 'Dry Waste';
        if (['battery', 'bulb', 'paint', 'chemical', 'oil', 'toxic', 'medical', 'syringe', 'pill'].some(k => top.includes(k))) return 'Hazardous Waste';
        if (['computer', 'phone', 'laptop', 'mouse', 'keyboard', 'electronic', 'monitor', 'tv', 'wire', 'screen'].some(k => top.includes(k))) return 'E-Waste';

        // If top result didn't match, check if ANY of the top 3 matched a specific Dry/Paper category (since paper often looks like 'trash' or 'carton' which might be lower probability)
        // This helps rescue "Paper" correctly even if "Ashcan" is #1
        const hasDry = classNames.some(name => checkDry(name));
        if (hasDry && !hasBio && !hasPlastic) return 'Dry Waste';

        // Explicit "Trash" detections usually mean Mixed - BUT only if we haven't found a specific type yet.
        if (classNames.some(name => ['trash', 'waste', 'garbage', 'rubbish', 'bin', 'ashcan'].some(k => name.includes(k)))) return 'Mixed Waste';

        // Default
        return 'Mixed Waste';
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImageURL(url);
            setPrediction(null);
            // Pass file to parent
            if (onImageSelected) onImageSelected(file);
            

        }
    };

    const getVanName = (wasteType) => {
        switch(wasteType) {
            case 'Bio-degradable Waste': return 'Bio-degradable Waste Van';
            case 'Plastic Waste': return 'Plastic garbage Van';
            case 'Glass Waste': return 'Glass Waste Van';
            case 'Dry Waste': return 'Dry Waste Van';
            case 'Mixed Waste': return 'Mixed Waste Van';
            default: return 'General Van';
        }
    };

    return (
        <div className="waste-classifier" style={{ 
            border: '2px dashed #ccc', 
            borderRadius: '12px', 
            padding: '20px', 
            textAlign: 'center',
            backgroundColor: '#fafafa',
            marginBottom: '20px'
        }}>
            <h4 style={{ marginTop: 0 }}>Upload a Picture</h4>
            
            {!imageURL ? (
                <div style={{ margin: '20px 0' }}>
                    <label htmlFor="ai-upload" className="btn-upload" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: '#386641',
                        color: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}>
                        <FiCamera /> Scan Item
                    </label>
                    <input 
                        id="ai-upload" 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleImageUpload} 
                        style={{ display: 'none' }} 
                    />
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
                        Take a photo to auto-detect waste type
                    </p>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <img 
                        ref={imageRef} 
                        src={imageURL} 
                        alt="Waste Item" 
                        crossOrigin="anonymous"
                        onLoad={classifyImage}
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '200px', 
                            borderRadius: '8px',
                            marginBottom: '10px'
                        }} 
                    />
                    <button 
                        onClick={() => { setImageURL(null); setPrediction(null); onClassify('Mixed Waste'); }}
                        style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            lineHeight: 1
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {loading && (
                <div style={{ color: '#386641', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <FiLoader className="spin" /> Analyzing...
                </div>
            )}

            {prediction && (
                <div style={{ 
                    marginTop: '10px', 
                    padding: '10px', 
                    background: prediction.wasteType === 'Bio-degradable Waste' ? '#e6f4ea' : prediction.wasteType === 'Plastic Waste' ? '#e3f2fd' : '#fff3e0',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)'
                }}>
                    <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '4px' }}>
                        {prediction.wasteType} Detected
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                        Object: {prediction.className} ({Math.round(prediction.probability * 100)}%)
                    </span>
                    <div style={{ fontSize: '0.9rem', marginTop: '8px', color: '#386641', fontWeight: 'bold' }}>
                        <FiCheck /> It's {prediction.wasteType}, {getVanName(prediction.wasteType)} is scheduled for your pickup.
                    </div>
                </div>
            )}

            {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
        </div>
    );
};

export default WasteClassifier;
