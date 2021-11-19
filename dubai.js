// Calculate an index and enhance the image to prepare it for classification


// 1. Set initial variables
// Filter for a location, this location is defined in the "Geometry Imports" tab in the "Map" interface
print("location of interest", location)

// Alternatively, define a country boundary
var country = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017")
                 .filterMetadata("country_co","equals","AE")
				         .geometry()

Map.centerObject(roi)


// 2. Get an image from a suitable collection

// 2.1 Collection after
// This is the Image collection of Landsat 8 Level 2 (Surface reflectance), Collection 2, Tier 1
var l8SR = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");
print("Landsat 8 Surface Reflectance", l8SR.first())

// 2.2 Collection before
// This is the Image collection containing the image before. If you are looking at events around the 1990s, you may use Landsat 5. 
// In that case, search for "landsat 5 sr" in the search bar above and import the collection.
// If you are careful, follow 2.1 portion and write

var l5SR = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
// Print to check your results
print("Collection before", l5SR.first())

// Standardize band names
    var bands_LS8 = ["SR_B2"  ,"SR_B3"   ,"SR_B4" ,"SR_B5" ,"SR_B6"   ,"SR_B7"   , "QA_PIXEL","QA_RADSAT"]
    var bands_LS5 = ["SR_B1"  ,"SR_B2"   ,"SR_B3" ,"SR_B4" ,"SR_B5"   ,"SR_B7"   , "QA_PIXEL","QA_RADSAT"]
    var bands_std = ["blue","green","red","nir","swir1","swir2", "QA_PIXEL","QA_RADSAT"]
 

// 2.3 Get image after

// An image from the Landsat 8 SR collection, at the location of your interest, acquired at the time of your choice
var imageAfter = l8SR
                  .filterBounds(location)
                  .filterDate("2020-09-09","2021-01-01") //Choose the suitable date range
                  .select(bands_LS8, bands_std)
                  .first() // (choose the first one in case there are many)
                  
// Print the image to the console
print("Image after", imageAfter)

// Similarly, get an image before
var imageBefore = l5SR
                  .filterBounds(location)
                  .filterDate("1990-01-01","1991-02-01") //Choose the suitable date range
                  .select(bands_LS5, bands_std)
                  .first() // (choose the first one in case there are many)
// Print the image to the console
print("Image before", imageBefore)


// 3. Display the image
// 3.1 Define visualization parameters for the image. 

// Change the bands combination to your needs

var imageVisParam_l8SR = 
                    {
                      "bands":["red","green","blue"], // These are the Red - Green - Blue bands on the Landsat 8 satellite
                      "min":0,"max":40000,       // Minimum reflectance value is 0 (0 is black), and maximum reflectance value is 40000 (40000 is white), depends on satellite 
                    };

// Similarly, define visualization parameters for the other sensor
////

// 3.2 Add the image to the Map, 
// with the visualization parameters defined above.
Map.addLayer(imageAfter, imageVisParam_l8SR, "imageAfter", 1);

// Add the image before here:
Map.addLayer(imageBefore, imageVisParam_l8SR, "imageBefore", 1);



// Center the map on the image, with a zoom level of 12.
Map.centerObject(location,12);


// IMAGE ENHANCEMENT
// 4. Enhance the image with cloud masking

// Define a function for cloud masking for Landsat 

var maskCloud_Landsat = function (image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands. This will change the reflectance values.
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.addBands(opticalBands, null, true)
      .addBands(thermalBands, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}


// An image from the Landsat 8 SR collection, at the location of your interest, acquired at the time of your choice

var collectionAfter = l8SR
                  .filterBounds(roi) //choose all images within the location
                  .filterDate("2020-01-01","2021-01-01") //Choose the suitable date range
                  .map(maskCloud_Landsat) //Mask cloud and cloud shadow from the image
                  .select(bands_LS8, bands_std) //Standardize band names
                  .map(function(image){return image.clip(roi)}) //clip images 
                  
var collectionBefore = l5SR
                  .filterBounds(roi) //choose all images within the location
                  .filterDate("1990-01-01","1991-02-01") //Choose the suitable date range
                  .map(maskCloud_Landsat) //Mask cloud and cloud shadow from the image
                  .select(bands_LS5, bands_std) //Standardize band names
                  // .map(function(image){return image.clip(country)}) //clip images 

// Make a cloud free composite
var cloudFreeComposite = collectionAfter.median()//.clip(country)
var cloudFreeCompositeBefore = collectionBefore.median()//.clip(country)

print("cloudFreeComposite",cloudFreeComposite)
print("cloudFreeCompositeBefore",cloudFreeCompositeBefore)

// Define new parameters due to adjustments from the cloud masking function.
var imageVisParam_l8SR_cloudMasked = 
                    {
                      "bands":["red","green","blue"], // These are the Red - Green - Blue bands on the Landsat 8 satellite
                      "min":0,"max":0.3,       // Minimum reflectance value is 0 (0 is black), and maximum reflectance value is 40000 (40000 is white), depends on satellite 
                    };
var imageVisParam_l5SR_cloudMasked = 
                    {
                      "bands":["red","green","blue"], // These are the Red - Green - Blue bands on the Landsat 8 satellite
                      "min":0,"max":0.3,       // Minimum reflectance value is 0 (0 is black), and maximum reflectance value is 40000 (40000 is white), depends on satellite 
                    };
// Add image to map
Map.addLayer(cloudFreeComposite, imageVisParam_l8SR_cloudMasked, "cloudFreeComposite", 1);
Map.addLayer(cloudFreeCompositeBefore, imageVisParam_l5SR_cloudMasked, "cloudFreeCompositeBefore", 1);


// 5. Calculate an index
// Use the normalizedDifference function for simple Normalized Difference Indices
var addNDVI = function(image){
  return image.addBands(image.normalizedDifference(['nir', 'red']).rename('ndvi'))
}

// For more complex indices, use mathematical expressions
var addEVI = function (image){
  var evi = image.expression(
    "2.5*((nir-red)/(nir+2.4*red+1))",
    {
      nir : image.select("nir"),
      red : image.select("red")
    }
    ).rename("evi")
  
  return image.addBands(evi)
}

// Try NDBI
var addNDBI = function(image){
  var ndbi = image.expression(
    "(swir2-nir)/(swir2+nir)",
    {
      nir : image.select("nir"),
      swir2 : image.select("swir2")
    }
    ).rename("ndbi")
  
  return image.addBands(ndbi)
}

// Try NDWI
var addNDWI = function(image){
  return image.addBands(image.normalizedDifference(['nir', 'swir2']).rename('ndwi'))
}

// Try MNDWI
var addMNDWI = function(image){
  return image.addBands(image.normalizedDifference(['green', 'swir2']).rename('mndwi'))
}
// Map the function to calculate indices over the collection
var collectionAfterEnhanced = collectionAfter.map(addNDVI)
                                             .map(addEVI)
                                             .map(addNDBI)
                                             .map(addNDWI)
                                             .map(addMNDWI)   
var collectionBeforeEnhanced = collectionBefore.map(addNDVI)
                                               .map(addEVI)
                                               .map(addNDBI)
                                               .map(addNDWI)
                                               .map(addMNDWI)
// Calculate the composite
var imageAfterEnhanced = collectionAfterEnhanced.median()
print("Image After, Enhanced",imageAfterEnhanced)

var imageBeforeEnhanced = collectionBeforeEnhanced.median()
print("Image Before, Enhanced",imageBeforeEnhanced)

// Add new parameter to display the NDVI index

// var imageVisParam_ndvi = 
//                     {
//                       "bands":["ndvi"],
//                       "min":0,"max":1,
//                       palette:["black","green"]
//                     };
                    
// var imageVisParam_evi = 
//                     {
//                       "bands":["evi"],
//                       "min":0,"max":0.5,
//                       palette:["black","green"]
//                     };
var imageVisParam_ndbi = 
                    {
                      "bands":["ndbi"],
                      "min":0,"max":0.5,
                      palette:["black","white"]
                    };

var imageVisParam_ndwi = 
                    {
                      "bands":["ndwi"],
                      "min":0,"max":0.5,
                      palette:["black","white"]
                    };
                    
var imageVisParam_mndwi = 
                    {
                      "bands":["mndwi"],
                      "min":0,"max":1,
                      palette:["black","white"]
                    };                    


// Add index images to the map
// Map.addLayer(imageAfterEnhanced,imageVisParam_ndvi,"NDVI")
// Map.addLayer(imageAfterEnhanced,imageVisParam_evi,"EVI")
Map.addLayer(imageAfterEnhanced,imageVisParam_ndbi,"NDBI")
Map.addLayer(imageAfterEnhanced,imageVisParam_ndwi,"NDWI")
Map.addLayer(imageAfterEnhanced,imageVisParam_mndwi,"MNDWI")

// Map.addLayer(imageBeforeEnhanced,imageVisParam_ndvi,"NDVI old")
// Map.addLayer(imageBeforeEnhanced,imageVisParam_evi,"EVI old")
Map.addLayer(imageBeforeEnhanced,imageVisParam_ndbi,"NDBI old")
Map.addLayer(imageBeforeEnhanced,imageVisParam_ndwi,"NDWI old")
Map.addLayer(imageBeforeEnhanced,imageVisParam_mndwi,"MNDWI old")

// 6. Classification
// 
// 6.1. Obtain training data
// Create training points as geometries

// Ensure randomness

var addGrid = function(boundary,size){
    /*
  Copyright (c) 2018 Gennadii Donchyts. All rights reserved.
  
  This work is licensed under the terms of the MIT license.  
  For a copy, see <https://opensource.org/licenses/MIT>.
  */
  
  var g = require('users/gena/packages:grid');
  
  // generateGridForGeometry(g, dx, dy, opt_marginx, opt_marginy, opt_proj)
  // generate a 500x500 m^2 grid for the area of interest
  
  // WEB
  var proj = 'EPSG:3857';
  var dx = size;
  var dy = size;
  var marginx = 0, marginy = 0;
  var grid = g.generateGridForGeometry(boundary, dx, dy, marginx, marginy, proj);
  Map.addLayer(grid, { color: 'brown' }, 'grid',1,0.5);

  return grid
}

addGrid(roi,500)

  // CHANGE THIS TO SUIT YOUR CLASS SCHEMES and COLOR
  
  var classes = ["urban","vegetation","water","bareland"]
  var colorChart = ["red","green","blue","brown"]
  var visParams_classes = {min: 0, max: 3, palette: colorChart}

var trainingPoints = ee.FeatureCollection([urban,vegetation,water,bareland])
print("Training Points", trainingPoints)



  // 6.2 Use these bands for classification. 
  // CHANGE THESE BANDS ACCORDING TO YOUR TARGET
  var predictionBands = ["blue","green","red","nir","swir1","swir2","ndvi","evi"]
  
  // The name of the property on the points storing the class label.
  var classProperty = 'class';
  
  // 6.3 Sample the composite to generate training data.  Note that the
  // class label is stored in the 'landcover' property.
  var training = imageAfterEnhanced.select(predictionBands).sampleRegions({
    collection: trainingPoints,
    properties: [classProperty],
    scale: 30
  });

// 6.3 Assessment of training data

var checkHistogram = function(image, trainingPoints,bands ,classes,colorChart,maximumReflectance,step)
  {
    // image: image to sample points from
    // trainingPoints: featureCollection of points used for training
    // bands: bands to sample
    // classes: classes considered in the trainingPoints
    // colorChart: color for each class
    // maximumReflectance: maximumReflectance of each band
    // step: number of steps for the histogram
  // var image = image.clip(roi);
  
  //histogram spectral reflectance values of selected 'bands' within interval [minimum,maximum] with step m
  // var bands = bands;
  // min
  var minimum = 0;
  // max
  var maximum = maximumReflectance;
  // var step = step;
  
  // Use this to determine appropriate min, max
  var minMax = image.reduceRegions({
    collection: trainingPoints,
    reducer: ee.Reducer.minMax(),
    scale: 30 , 
    // scale:scale,
    
  })
  print("minimum and maximum values",minMax)
  
  //apply fixedHistogram reducer, it returns a feature collection 
  // with all the information as arrays
  var histogram = image.reduceRegions({
    collection: trainingPoints,
    reducer: ee.Reducer.fixedHistogram(minimum,maximum,step),
    scale: 30 , 
    // scale:scale,
  });
  print("histogram",histogram);
  var name = "test"
  Export.table.toDrive({
    collection: histogram,
    description: "export_histogram_" + name, 
    folder: "spectral_check_seagrass_sites_202012", 
    fileNamePrefix: name,
    fileFormat: "csv"
  })
  // (collection, description, folder, fileNamePrefix, fileFormat, selectors)
  
  //set up a display for the arrays
  // var bands = predictionBands
  
  // list of reflectance values
  var x = ee.List.sequence(minimum,null,(maximum-minimum)/step,step);
  
  
  for (var target in bands) {
    if (bands.length >1 ) {
      var z = ee.List(histogram.aggregate_array(bands[target]));
    } else {
      var z = ee.List(histogram.aggregate_array('histogram'));
    }
  
    var y = ee.Array.cat(z, 1).slice({axis:1,start:1,end:null,step:2});
    var options = {
      title: 'Image ' + bands[target] + ': class histogram',
      fontSize: 20,
      hAxis: {title: 'Reflectance'},
      vAxis: {title: 'Count of reflectance'},
      series: colorChart
    };
    //print charts
    var chart = ui.Chart.array.values(y, 0, x)
      .setSeriesNames(classes)
      .setOptions(options)
      .setChartType('ColumnChart');
    print(chart);
    
  }
  return chart
}
// var checkHistogram = function(image, trainingPoints,bands ,classes,colorChart,maximumReflectance,step)
 
var reflectanceBands = ["blue","green","red","nir","swir1","swir2"]
checkHistogram(imageAfterEnhanced,trainingPoints,reflectanceBands,classes,colorChart,0.4,15)

// Assessment of training data 2: A function to check the spectral response of the three classes

var checkSpectra = function (image,trainingPolygons_pure){
    // Define customization options.
  var options = {
    title: 'Spectral Response by class',
    hAxis: {title: 'Wavelength (micrometers)'},
    vAxis: {title: 'Reflectance'},
    lineWidth: 1,
    pointSize: 4,
    series: {
      0: {color: 'red'}, // urban
      1: {color: 'green'}, // vegetation
      2: {color: 'blue'}, // water
      3: {color: 'brown'} // bareland
   
        }};

// Define a list of wavelengths for X-axis labels.
  var wavelengths = [0.48, 0.56, 0.65, 0.86, 1.61, 2.2];
  var bands =["blue","green","red","nir","swir1","swir2"]
  var chart = ui.Chart.image.regions({
    image: image.select(bands), 
    regions: trainingPolygons_pure, 
    reducer: ee.Reducer.mean(), 
    scale: 30 , 
    seriesProperty: "label", 
    xLabels: wavelengths
  })
  .setChartType("LineChart")
  .setOptions(options) 
  ;
  
  return chart
  
}

// Print a graph of the spectral responses of the training points
print(checkSpectra(imageAfterEnhanced,trainingPoints))



  // 6.4 Train a CART classifier.
  // Or choose a classifier you like
  var classifier = ee.Classifier.smileCart().train({
    features: training,
    classProperty: classProperty,
  });


  // Print some info about the classifier (specific to CART).
  print('CART, explained', classifier.explain());

  // 6.5 Classify the image.
  var classifiedAfter = imageAfterEnhanced.classify(classifier);
  var classifiedBefore = imageBeforeEnhanced.classify(classifier);
  
  // 6.6 Display the classified image
  Map.addLayer(classifiedAfter, visParams_classes, "classifiedAfter");
  Map.addLayer(classifiedBefore, visParams_classes, "classifiedBefore");




// 7. Post classification

// 7.1 Accuracy assessment
// Optionally, do some accuracy assessment.  Fist, add a column of
// random uniforms to the training dataset.
var withRandom = training.randomColumn('random');

// We want to reserve some of the data for testing, to avoid overfitting the model.
var split = 0.7;  // Roughly 70% training, 30% testing.
var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
var testingPartition = withRandom.filter(ee.Filter.gte('random', split));

// Trained with 70% of our data.
var trainedClassifier = ee.Classifier.smileRandomForest(5).train({
  features: trainingPartition,
  classProperty: classProperty,
  inputProperties: predictionBands
});

// Classify the test FeatureCollection.
var test = testingPartition.classify(trainedClassifier);

// Print the confusion matrix.
var confusionMatrix = test.errorMatrix(classProperty, 'classification');
print('Confusion Matrix', confusionMatrix, 
      'Overall accuracy',confusionMatrix.accuracy(),
      'Producers accuracy',confusionMatrix.producersAccuracy(),
      'Consumers accuracy',confusionMatrix.consumersAccuracy());
      


// 7.2 Smoothing
// Morphological processing of land cover.  This example
// includes spatial smoothing (neighborhood mode) followed by
// dilation, erosion and dilation again.  Reprojection is
// used to force these operations to be performed at the
// native scale of the input (rather than variable pixel
// sizes based on zoom level).



var smoothing = function (classifiedImage){
// Define a kernel.
var kernel = ee.Kernel.circle({radius: 1});

// Perform an erosion followed by a dilation, display.
var opened = classifiedImage
             .focal_min({kernel: kernel, iterations: 2})
             .focal_max({kernel: kernel, iterations: 2});
// Map.addLayer(opened, {}, 'opened');

  return ee.Image(opened).copyProperties(classifiedImage)
}

var smoothedAfter = ee.Image(smoothing(classifiedAfter))
var smoothedBefore = ee.Image(smoothing(classifiedBefore))

Map.addLayer(smoothedAfter, visParams_classes, "smoothedAfter classification",1,1);
Map.addLayer(smoothedBefore, visParams_classes, "smoothedBefore classification",1,1);

// 8. Change detection


var imageBefore = smoothedBefore;
var imageAfter = smoothedAfter;


  // Create a merged image with 2 classifications as different bands
  print("imageBefore",imageBefore,"imageAfter",imageAfter)
  var combined = imageAfter.rename("classificationAfter").addBands(imageBefore.rename("classificationBefore"))
  print("combined",combined)
  
  // Define water loss as pixels where 
  // the classification before was water (equals to 2) 
  // but classification after was not water(not equals to 2)
  
  var waterLoss = combined.select('classificationBefore').eq(2).and(combined.select("classificationAfter").neq(2))
  Map.addLayer(waterLoss,{},'waterLoss')
  
  // Similarly, define water remain and water gain
  
  var waterRemain = combined.select('classificationBefore').eq(2).and(combined.select("classificationAfter").eq(2))
  Map.addLayer(waterRemain,{},'waterRemain')
  
  var waterGain = combined.select('classificationBefore').neq(2).and(combined.select("classificationAfter").eq(2))
  Map.addLayer(waterGain,{},'waterGain')
  
  // Blend the above into a new image
  // Manually define the band value to signify which change, in this case:
  // 0 = water loss, red
  // 1 = water remain, green
  // 2 = water gain, blue
  // Use updatemask to manually define where the values are used
  var waterChange = ee.Image(0).updateMask(waterLoss)
                .blend(ee.Image(1).updateMask(waterRemain))
                .blend(ee.Image(2).updateMask(waterGain))
  print("water change", waterChange)
  var visParams_change = {min:0,max:2,palette:["red","green","blue"]}              
  
  Map.addLayer(waterChange,visParams_change,'waterChange')



// 9. export the image you need to drive
Export.image.toDrive({
  image: smoothedAfter, //the image you want to export
  // description, 
  // folder, 
  // fileNamePrefix, 
  region:roi, //you need to define a region here for the export
  scale: 30,  //30m for landsat
  // dimensions, 
  // crs, crsTransform, maxPixels, shardSize, fileDimensions, skipEmptyTiles, fileFormat, formatOptions
  
})


// 10. Calculate area 

  var options = {
    hAxis: {title: 'Water change'},
    vAxis: {title: 'Area in ha'},
    title: 'Water area change ',
    series: {
      // : { color: 'black'},
      0: { color: 'red'},
      1: { color: 'green'},
      2: { color: 'blue'},
    }
  };

  var waterareaChart = ui.Chart.image.byClass({
    image: ee.Image.pixelArea().multiply(0.0001).addBands(waterChange),
    classBand: 'constant', 
    region: geometry,
    scale: 30,
    reducer: ee.Reducer.sum(),
    classLabels: ["water loss",'water remain', 'water gain']
  }).setOptions(options);
  
  print(waterareaChart)
//---------------------------------------  
    // Define urban loss as pixels where 
  // the classification before was urban (equals to 0) 
  // but classification after was not urban(not equals to 0)
  
  var urbanLoss = combined.select('classificationBefore').eq(0).and(combined.select("classificationAfter").neq(0))
  Map.addLayer(urbanLoss,{},'urbanLoss')
  
  // Similarly, define urban remain and urban gain
  
  var urbanRemain = combined.select('classificationBefore').eq(0).and(combined.select("classificationAfter").eq(0))
  Map.addLayer(urbanRemain,{},'urbanRemain')
  
  var urbanGain = combined.select('classificationBefore').neq(0).and(combined.select("classificationAfter").eq(0))
  Map.addLayer(urbanGain,{},'urbanGain')
  
  // Blend the above into a new image
  // Manually define the band value to signify which change, in this case:
  // 0 = urban loss, red
  // 1 = urban remain, green
  // 2 = urban gain, blue
  // Use updatemask to manually define where the values are used
  var urbanChange = ee.Image(0).updateMask(urbanLoss)
                .blend(ee.Image(1).updateMask(urbanRemain))
                .blend(ee.Image(2).updateMask(urbanGain))
  print("urban change", urbanChange)
  var visParams_change = {min:0,max:2,palette:["red","green","blue"]}              
  
  Map.addLayer(urbanChange,visParams_change,'urbanChange')



// 9. export the image you need to drive
Export.image.toDrive({
  image: smoothedAfter, //the image you want to export
  // description, 
  // folder, 
  // fileNamePrefix, 
  region:roi, //you need to define a region here for the export
  scale: 30,  //30m for landsat
  // dimensions, 
  // crs, crsTransform, maxPixels, shardSize, fileDimensions, skipEmptyTiles, fileFormat, formatOptions
  
})


// 10. Calculate area 

  var options = {
    hAxis: {title: 'Urban change'},
    vAxis: {title: 'Area in ha'},
    title: 'Urban area change ',
    series: {
      // : { color: 'black'},
      0: { color: 'red'},
      1: { color: 'green'},
      2: { color: 'blue'},
    }
  };

  var urbanareaChart = ui.Chart.image.byClass({
    image: ee.Image.pixelArea().multiply(0.0001).addBands(urbanChange),
    classBand: 'constant', 
    region: geometry,
    scale: 30,
    reducer: ee.Reducer.sum(),
    classLabels: ["urban loss",'urban remain', 'urban gain']
  }).setOptions(options);
  
  print(urbanareaChart)
