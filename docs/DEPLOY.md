# 홈랩 배포 가이드 (Ubuntu VM · Docker · NAS)

커스텀 fork이므로 공식 이미지(`bpatrik/pigallery2`)를 쓰지 않고 **소스에서 직접 이미지를 빌드**한다. 저장소 루트의 `Dockerfile`과 `docker-compose.yml`을 사용한다.

## 0. 사전 준비 (VM에서 1회)

```bash
# Docker + compose 플러그인
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER   # 로그아웃 후 재로그인
```

## 1. NAS(NFS)를 VM에 마운트 (읽기 전용)

```bash
sudo apt-get install -y nfs-common
sudo mkdir -p /mnt/nas/photos
# 즉시 마운트 (테스트)
sudo mount -t nfs -o ro,soft <NAS_IP>:/<공유경로> /mnt/nas/photos
# 부팅 시 자동 마운트: /etc/fstab 에 추가
echo '<NAS_IP>:/<공유경로>  /mnt/nas/photos  nfs  ro,soft,_netdev  0  0' | sudo tee -a /etc/fstab
sudo mount -a && ls /mnt/nas/photos   # 사진이 보이면 성공
```

`docker-compose.yml`의 `/mnt/nas/photos` 경로가 위와 일치하는지 확인한다.

## 2. 소스 코드를 VM으로 가져오기

둘 중 하나:

- **Git 원격(권장)**: fork를 (비공개) 원격에 push 한 뒤 VM에서 clone
  ```bash
  git clone <내-원격-URL> ~/pigallery2_custom && cd ~/pigallery2_custom
  ```
- **직접 전송(rsync)**: 개발 PC에서
  ```bash
  rsync -av --exclude node_modules --exclude .git --exclude release --exclude dist \
    ./pigallery2_custom/  <user>@<VM-IP>:~/pigallery2_custom/
  ```

## 3. 빌드 & 실행

```bash
cd ~/pigallery2_custom
docker compose up -d --build      # 최초 빌드는 수 분 소요(Angular 빌드)
docker compose logs -f            # 기동/스캔 로그 확인
```

> 빌드는 RAM을 많이 쓴다(Angular). VM 메모리가 부족하면 개발 PC(같은 amd64)에서
> `docker build -t pigallery2-custom .` 후
> `docker save pigallery2-custom | ssh <user>@<VM> 'docker load'` 로 이미지를 옮기고,
> compose의 `build:` 블록을 지우고 `image: pigallery2-custom:latest`만 남겨 실행한다.

## 4. 최초 설정

1. 브라우저로 `http://<VM-IP>:8080` 접속 → 로그인 페이지에서 **관리자 계정 생성**.
2. 사진 폴더는 컨테이너 기본값 `/app/data/images`(=NAS, 읽기전용)로 이미 지정됨.
3. 관리자 > 설정에서 인덱싱을 실행(또는 자동)하면 NAS를 스캔한다.
   - 엔티티 스키마가 바뀌었으므로 **최초 기동 시 DB가 새로 생성·재스캔**된다(정상).
   - 인덱싱 완료 후 백그라운드 **AI Metadata 잡**이 돌며 AI 이미지 메타데이터를 채운다.

## 5. 데이터 위치 / 백업

| 호스트 경로 | 컨테이너 | 용도 | 비고 |
|---|---|---|---|
| `db-data`(도커 볼륨) | `/app/data/db` | SQLite DB | **로컬 디스크 전용**, 백업 대상 |
| `./data/config` | `/app/data/config` | `config.json`·확장 | 백업 대상 |
| `./data/tmp` | `/app/data/tmp` | 썸네일/트랜스코딩 캐시 | 재생성 가능, 용량 큼 |
| `/mnt/nas/photos` | `/app/data/images` | 원본 사진 | NAS, 읽기전용 |

`config.json`은 최초 기동 시 `./data/config/`에 생성된다. 사이트명·기능 등을 바꾸려면 이 파일을 수정 후 `docker compose restart`.

## 6. 외부 접근 (내부 전용)

이 서비스는 내부 전용이므로 `8080`을 공개하지 말고, 기존 홈랩 **Nginx 역방향 프록시 + WireGuard VPN(10.99.0.0/24)** 뒤에 둔다. Nginx에서 `proxy_pass http://<VM-IP>:8080;` 로 연결.

## 7. 갱신 (코드 수정 후 재배포)

```bash
cd ~/pigallery2_custom
git pull                          # 또는 rsync 재전송
docker compose up -d --build
```

엔티티(`DataStructureVersion`)가 또 바뀐 경우에만 DB가 재생성된다. 그 외에는 DB·설정·캐시가 유지된다.
