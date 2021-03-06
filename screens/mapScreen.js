import {
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    View,
    Text,
    Animated,
    Easing,
    TouchableOpacity, TextInput
} from "react-native";
import {Marker, PROVIDER_GOOGLE} from "react-native-maps";
import MapView from "react-native-map-clustering";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {image4ioApiKey, image4ioApiSecret, serverIp, usingServer} from "../localProperties";
import {Button} from "react-native-elements";
import * as ImagePicker from 'expo-image-picker';
import { encode } from 'js-base64';
import * as Location from 'expo-location';
import {ImageGallery} from "@georstat/react-native-image-gallery";
import Pressable from "react-native/Libraries/Components/Pressable/Pressable";

export default function MapScreen({navigation, route}) {

    const {loggedUser} = route.params;
    const [pins, setPins] = useState([]);
    const [placePins, setPlacePins] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [galleryVisible, setGalleryVisible] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState({});
    const [imageUri, setImageUri] = useState(null);
    const [localPic, setLocalPic] = useState(null);
    const [galleryPermission, setGalleryPermission] = useState(null);
    const [loading, setLoading] = useState(null);
    const map = useRef(null);
    const searchRef = useRef(null);

    useEffect(async () => {
        setLoading(true);

        await permissionFunction();

        let location = await getLocation();
        console.log('Location: ' + location.coords.latitude + '/' + location.coords.longitude);
        await getContacts(location);

        await updateLocation(location.coords);

        setShowSearch(true);

        map.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03
        });
    }, []);

    async function getLocation() {
        let {status} = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.log('Permission to access location was denied');
            return;
        }
        return await Location.getCurrentPositionAsync({});
    }

    async function updateLocation(coords) {
        if (usingServer) {
            console.log('Location to update: ' + coords.latitude + '/' + coords.longitude);
            await fetch(
                'http://'.concat(serverIp).concat(':8080/user/updateLocation'), {
                    method: 'post',
                    mode: 'no-cors',
                    headers: {
                        'Accept' : 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(coords)
                }
            )
                .catch(console.error)
        }
    }

    async function getContacts(location) {
        if (usingServer) {
            await fetch(
                'http://'.concat(serverIp).concat(':8080/user/contacts'), {
                    method: 'get',
                    mode: 'no-cors'
                }
            )
                .then(res => res.json())
                .then(data => {
                    if (data[0]) {
                        data[0].coordinates = {latitude: location.coords.latitude, longitude: location.coords.longitude};
                    }
                    console.log(JSON.stringify(data));
                    setPins(data);
                })
                .catch(console.error)
        } else {
            setPins([
                {
                    id: 1,
                    coordinates: {latitude: location.coords.latitude, longitude: location.coords.longitude},
                    username: 'cdondovich',
                    pictureLastUpdated: Date.now()
                },
                {
                    id: 2,
                    coordinates: {latitude: -34.611257, longitude: -58.3801285},
                    username: 'amelian'
                },
                {
                    id: 3,
                    coordinates: {latitude: -34.621257, longitude: -58.3901285},
                    username: 'drojas'
                }
            ]);
        }
    }

    async function getPlace(place) {
        if (usingServer) {
            await fetch(
                'http://'.concat(serverIp).concat(':8080/place/get/').concat(place), {
                    method: 'get',
                    mode: 'no-cors'
                }
            )
                .then(res => res.json())
                .then(data => {
                    setSelectedMarker(data);
                    if (data.pictures.length > 0) {
                        setImageUri(data.pictures[0].link);
                    } else {
                        setImageUri('https://cdn.image4.io/deruta/misc/nopic.png');
                    }
                    setModalVisible(true);
                })
                .catch(console.error)
        } else {
            setPlacePins([
                {
                    id: 1,
                    coordinates: {latitude: -34.61549, longitude: -58.38592},
                    name: 'Roots Backpackers Hostel Test'
                }
            ]);
        }
    }

    const setMarker = (marker) => {
        if (marker.username === loggedUser) {
            if (!localPic) {
                let uri = 'https://cdn.image4.io/deruta/misc/nopic.png';
                if (marker.pictureLastUpdated) {
                    uri = 'https://cdn.image4.io/deruta/avatars/' + marker.username + '.png?t=' + marker.pictureLastUpdated;
                }
                setLocalPic(uri);
                setImageUri(uri);
            } else {
                setImageUri(localPic);
            }
        } else {
            if (marker.pictureLastUpdated) {
                setImageUri('https://cdn.image4.io/deruta/avatars/' + marker.username + '.png?t=' + marker.pictureLastUpdated);
            } else {
                setImageUri('https://cdn.image4.io/deruta/misc/nopic.png');
            }
        }
        setSelectedMarker(marker);
        setModalVisible(true);
    }

    const getPlaceMarkerPicture = (marker) => {
        if (['Hostel', 'Hotel'] .includes(marker.type.name)) {
            return <Image source={require('../assets/markerHostel.png')}
                          style={{height: 40, width: 40, borderRadius: 20}}/>;
        } if (marker.type.name == 'Restaurant') {
            return <Image source={require('../assets/markerRestaurant.png')}
                          style={{height: 40, width: 40, borderRadius: 20}}/>;
        } if (marker.type.name == 'Tourist Attraction') {
            return <Image source={require('../assets/markerAttraction.png')}
                          style={{height: 40, width: 40, borderRadius: 20}}/>;
        } if (marker.type.name == 'Mechanic and Parts') {
            return <Image source={require('../assets/markerMechanic.png')}
                          style={{height: 40, width: 40, borderRadius: 20}}/>;
        } if (['Wild Camping', 'Informal Campsite', 'Established Campground'] .includes(marker.type.name)) {
            return <Image source={require('../assets/markerCamping.png')}
                          style={{height: 40, width: 40, borderRadius: 20}}/>;
        } else {
            return <Image source={require('../assets/markerOther.png')}
                          style={{height: 40, width: 40, borderRadius: 20}}/>;
        }
    };

    const getMarkerPicture = (marker) => {
        return (marker.pictureLastUpdated != null) ?
            <Image source={{uri: 'https://cdn.image4.io/deruta/avatars/' + marker.username + '.png?t=' + marker.pictureLastUpdated}}
                   style={{height: 40, width: 40, borderRadius: 20, borderColor: '#35CE8D', borderWidth: 2}}/>
            :
            <Image source={require('../assets/nopic.png')}
                   style={{height: 40, width: 40, borderRadius: 20}}/>;

    };

    const mapImages = () => {
        return selectedMarker.username ? [{id: 1, url: imageUri}] : (selectedMarker.pictures ? selectedMarker.pictures.map((picture) => { return {id: picture.id, url: picture.link}}) : []);
    };

    const mapMarkers = () => {
        return pins.map((marker) => <Marker
            key={marker.id}
            coordinate={marker.coordinates}
            title={marker.name}
            onCalloutPress={() => {setMarker(marker)}}
        >
            {getMarkerPicture(marker)}

        </Marker>)
    };

    const mapPlaceMarkers = () => {
        return placePins.map((marker) => <Marker
            key={marker.id}
            coordinate={marker.coordinates}
            title={marker.name}
            onCalloutPress={() => {getPlace(marker.id + '-' + marker.repository)}}
        >
            {getPlaceMarkerPicture(marker)}

        </Marker>);
    };

    const permissionFunction = async () => {
        const imagePermission = await ImagePicker.getMediaLibraryPermissionsAsync();
        console.log("imagePermission: " + imagePermission.status);
        setGalleryPermission(imagePermission.status === 'granted');
        if (imagePermission.status !== 'granted') {
            console.log('Permission for media access needed.');
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
            aspect: [1,1]
        });
        if (!result.cancelled) {
            setLocalPic(result.uri);
            setImageUri(result.uri);
            let body = new FormData();
            body.append('image', {uri: result.uri, name: loggedUser + '.png', type: 'image/png'});
            body.append('useFilename', 'true');
            body.append('overwrite', 'true');
            body.append('path', '/avatars');
            await fetch(
                'https://api.image4.io/v1.0/uploadImage', {
                    method: 'post',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': 'Basic ' + encode(image4ioApiKey + ':' + image4ioApiSecret)
                    },
                    body: body
                }
            )
                .then((res) => res.json())
                .then((res) => {
                    fetch(
                        'https://api.image4.io/v1.0/purge', {
                            method: 'delete',
                            mode: 'no-cors',
                            headers: {
                                'Authorization': 'Basic ' + encode(image4ioApiKey + ':' + image4ioApiSecret)
                            }
                        }
                    ).then(async () => {
                        if (usingServer) {
                            await fetch(
                                'http://'.concat(serverIp).concat(':8080/user/pictureUpdated'), {
                                    method: 'post',
                                    mode: 'no-cors',
                                    headers: {
                                        'Accept' : 'application/json',
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        timestamp: selectedMarker.pictureLastUpdated
                                    })
                                }
                            )
                                .then(res => res.json())
                                .then(data => {
                                    selectedMarker.pictureLastUpdated = data;

                                })
                                .then(() => {
                                    setImageUri('https://cdn.image4.io/deruta/avatars/' + selectedMarker.username + '.png?t=' + selectedMarker.pictureLastUpdated)
                                })
                                .catch(console.error)
                        }
                    });
                })
                .catch((e) => console.log(e))
        }
    };

    const showChangePictureButton = (username) => {
        return loggedUser === username ? <View style={{flex:2, flexDirection: 'column-reverse'}}>
            <Button
                buttonStyle={styles.modalButtonStyle}
                title={"CAMBIAR IMAGEN"}
                onPress={pickImage}>
            </Button>
        </View>
            :
        <View style={{flex:1, flexDirection: 'column-reverse'}}></View>
    }

    const closeGallery = () => setGalleryVisible(false);

    const renderHeaderComponent = (image, currentIndex) => {
        return (
            <View style={{flex:4, backgroundColor: '#00000090'}}>
                <TouchableOpacity onPress={closeGallery}>
                    <Image
                        style={styles.closeButton}
                        source={require('../assets/close.png')}/>
                </TouchableOpacity>
            </View>);
    };

    const renderCustomImage = (image) => {
        return (
            <View style={{flex:1}}>
                <View style={{flex:1}}></View>
                <View style={{flex:2, alignItems: 'center', justifyContent: 'center'}}>
                    <Image
                        source={{uri: image.url}}
                        style={styles.galleryImage}
                    />
                </View>
                <View style={{flex:1}}></View>
            </View>
        );
    };

    const calcMinLatByOffset = (lng, offset) => {
        const factValue = lng - offset;
        if (factValue < -90) {
            return (90 + offset) * -1;
        }
        return factValue;
    };

    const calcMaxLatByOffset = (lng, offset) => {
        const factValue = lng + offset;
        if (90 < factValue) {
            return (90 - offset) * -1;
        }
        return factValue;
    };

    const calcMinLngByOffset = (lng, offset) => {
        const factValue = lng - offset;
        if (factValue < -180) {
            return (180 + offset) * -1;
        }
        return factValue;
    };

    const calcMaxLngByOffset = (lng, offset) => {
        const factValue = lng + offset;
        if (180 < factValue) {
            return (180 - offset) * -1;
        }
        return factValue;
    };

    async function loadNewPlaces(region) {
        if (showSearch) searchRef.current.blur();
        if (region.latitude !== 0 && region.longitude !== 0) {
            const latOffset = region.latitudeDelta / 2;
            const lngD = (region.longitudeDelta < -180) ? 360 + region.longitudeDelta : region.longitudeDelta;
            const lngOffset = lngD / 2;
            if (usingServer) {
                await fetch(
                    'http://'.concat(serverIp).concat(':8080/place/getByRegion'), {
                        method: 'post',
                        mode: 'no-cors',
                        headers: {
                            'Accept' : 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            minLng: calcMinLngByOffset(region.longitude, lngOffset), // westLng - min lng
                            minLat: calcMinLatByOffset(region.latitude, latOffset), // southLat - min lat
                            maxLng: calcMaxLngByOffset(region.longitude, lngOffset), // eastLng - max lng
                            maxLat: calcMaxLatByOffset(region.latitude, latOffset),// northLat - max lat
                        })
                    }
                )
                    .then(res => res.json())
                    .then(data => {
                        console.log('New places: ' + data.length);
                        placePins.splice(2, 20);
                        setPlacePins(data);
                        setLoading(false);
                    })
                    .catch(console.error)
            } else {
                setPlacePins([
                    {
                        id: 1,
                        coordinates: {latitude: -34.61549, longitude: -58.38592},
                        name: 'Roots Backpackers Hostel Test'
                    }
                ]);
            }
        }
    };

    const showView = function () {
        return showSearch ? <View style={[styles.modalSearch]}>
            <View style={{flex: 8, justifyContent: 'center',}}>
                <TextInput
                    ref={searchRef}
                    style={styles.textContainer}
                />
            </View>
            <View style={{flex: 1, justifyContent: 'center'}}>
                <Image style={styles.magnifier}
                       source={require('../assets/magnifier.png')} />
            </View>
        </View> : null;
    }

    return (
        <View style={styles.container}>
            <Modal
                visible={loading}
                animationType={"fade"}>
                <View style={styles.loadingView}>
                    <Animated.Image
                        style={styles.reloadImage}
                        source={require('../assets/camper.png')}></Animated.Image>
                    <Text style={styles.loadingText}>
                        CARGANDO...
                    </Text>

                </View>
            </Modal>
            <Modal
                visible={modalVisible}
                transparent
                animationType={"fade"}>
                <View style={{flex:1}}></View>
                <View
                    style={styles.centeredView}>
                    <View style={{flex:1}}></View>
                    <View
                        style={styles.modalStyle}>
                        <View style={{paddingTop: 20}}>
                            <TouchableOpacity onPress={() => setGalleryVisible(true)}>
                                <Image
                                    style={styles.image}
                                    source={{uri: imageUri}}
                                    defaultSource={require('../assets/nopic.png')}/>
                            </TouchableOpacity>
                        </View>
                        <View style={{flex:2, paddingTop: 20, alignContent: "center"}}>
                            <Text
                                style={styles.modalTitle}>
                                {selectedMarker.name}
                            </Text>
                        </View>
                        <View style={{flex:4, padding: 20}}>
                            <Text
                                style={styles.modalText}>
                                {selectedMarker.description ? selectedMarker.description : ''}
                            </Text>
                        </View>
                        {showChangePictureButton(selectedMarker.username)}
                        <View style={{flex:2, flexDirection: 'column-reverse', paddingBottom: 20}}>
                            <Button
                                buttonStyle={styles.modalButtonStyle}
                                title={"CERRAR"}
                                onPress={() => setModalVisible(false)}>
                            </Button>
                        </View>

                    </View>
                    <View style={{flex:1}}></View>
                </View>
                <View style={{flex:1}}></View>
            </Modal>
            <ImageGallery
                close={closeGallery}
                isOpen={galleryVisible}
                renderHeaderComponent={renderHeaderComponent}
                renderCustomImage={renderCustomImage}
                images={mapImages()}/>

            <MapView
                ref={map}
                provider={PROVIDER_GOOGLE}
                style={styles.mapStyle}
                loadingEnabled={true}
                onRegionChangeComplete={(region) => loadNewPlaces(region)}
                onPress={() => {if (showSearch) searchRef.current.blur()}}
                tracksViewChanges={false}
                initialRegion={{
                    latitude: 0,
                    longitude: 0,
                    latitudeDelta: 0.25,
                    longitudeDelta: 0.15}}
                mapType="standard">
                {mapMarkers()}
                {mapPlaceMarkers()}
            </MapView>
            {showView()}
        </View>
    );
};

const spinValue = new Animated.Value(0);

// First set up animation
Animated.loop(
    Animated.timing(
        spinValue,
        {
            toValue: 1,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true
        }
    )
).start();

const spin = spinValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '20deg', '0deg', '-20deg', '0deg']
});

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
    textContainer: {
        fontSize: 20,
    },
    loadingView: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    galleryText: {
        fontSize: 15,
        color: '#ffffff'
    },
    loadingText: {
        marginTop: 20,
        fontSize: 35
    },
    mapStyle: {
        height: '100%',
        width: '100%',
        position: 'absolute'
    },
    centeredView: {
        flex: 6,
        flexDirection: 'row',
    },
    centeredSearchView: {
        height: 40,
        flexDirection: 'row',
    },
    modalStyle: {
        flex: 5,
        backgroundColor: '#ddd',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#bbb'
    },
    modalSearch: {
        backgroundColor: '#ddd',
        borderRadius: 10,
        paddingLeft: 10,
        borderWidth: 3,
        borderColor: '#bbb',
        justifyContent: 'center',
        flexDirection: 'row',
        height: 50, position: 'absolute', top: 50, left: 20, right: 20
    },
    modalTitle: {
        fontSize: 30,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    modalText: {
        fontSize: 15
    },
    modalButtonStyle: {
        borderRadius: 10
    },
    image: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 3,
        borderColor: '#35CE8D'
    },
    magnifier: {
        width: 25,
        height: 25
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 75,
        borderWidth: 3,
        borderColor: '#000000',
        marginTop: 10,
        marginLeft: 10
    },
    galleryImage: {
        width: '90%',
        height: '90%'
    },
    reloadImage: {
        width: 50,
        height: 50,
        transform: [{rotate: spin}]
    }
});